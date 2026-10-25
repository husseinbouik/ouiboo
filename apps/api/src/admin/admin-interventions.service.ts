import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    BookingPaymentPlanStatus,
    BookingPaymentStatus,
    BookingStatus,
    ExternalPaymentStage,
    ExternalPaymentStatus,
    Prisma,
    RefundCaseStatus,
    RefundStatus,
    SessionGroupStatus,
    VerificationStatus,
} from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { StagedPaymentsService } from '../staged-payments/staged-payments.service';
import { RefundsService } from '../refunds/refunds.service';
import { REFUND_ACTIVE_STATUSES } from '../refunds/refunds.util';
import { toMoneyDecimal } from '../common/money.util';
import type { BookingRepairAction } from './dto/admin-interventions.dto';

/**
 * #423 — admin stuck-state interventions (Council P0-21).
 *
 * Until now, a diverged booking, a pending-minimum group whose deadline
 * was mis-set, or a wrongly-completed refund case could only be fixed
 * with direct database access. This service gives admins bounded,
 * named operations for exactly those stuck states — no free-form
 * status setter exists anywhere here.
 *
 * Every intervention:
 * - requires a non-empty `reason`,
 * - runs in ONE transaction together with its AuditLog row (following
 *   the RefundsService.audit pattern, not fire-and-forget logging), so
 *   the audit trail can never claim an intervention the state change
 *   contradicts, and vice versa,
 * - records before/after state in the audit metadata.
 */

type Tx = Prisma.TransactionClient;

export interface InterventionActor {
    id: string;
    email?: string | null;
}

const COUNTED_PLAN_STATUSES: BookingPaymentPlanStatus[] = [
    BookingPaymentPlanStatus.DEPOSIT_PAID,
    BookingPaymentPlanStatus.BALANCE_DUE,
    BookingPaymentPlanStatus.FULLY_PAID,
];

/** Booking statuses a resync may never move a booking out of. */
const LOCKED_BOOKING_STATUSES: BookingStatus[] = [
    BookingStatus.CANCELLED,
    BookingStatus.COMPLETED,
    BookingStatus.REJECTED,
];

@Injectable()
export class AdminInterventionsService {
    constructor(
        private db: DatabaseService,
        private stagedPaymentsService: StagedPaymentsService,
        private refundsService: RefundsService,
    ) { }

    // ------------------------------------------------------------------
    // Groups (staged-payment sessions stuck in PENDING_MINIMUM)
    // ------------------------------------------------------------------

    async listPendingGroups(query: { page?: string; limit?: string; q?: string } = {}) {
        const parsedPage = Number(query.page);
        const parsedLimit = Number(query.limit);
        const page = Number.isFinite(parsedPage) ? Math.max(Math.floor(parsedPage), 1) : 1;
        const limit = Number.isFinite(parsedLimit)
            ? Math.min(Math.max(Math.floor(parsedLimit), 1), 100)
            : 25;
        const search = query.q?.trim();
        const where: Prisma.TripSessionWhereInput = {
            groupStatus: SessionGroupStatus.PENDING_MINIMUM,
            ...(search
                ? { template: { title: { contains: search, mode: 'insensitive' } } }
                : {}),
        };
        const [sessions, total] = await Promise.all([
            this.db.tripSession.findMany({
                where,
                include: {
                    template: {
                        select: { title: true, agency: { select: { companyName: true } } },
                    },
                    paymentPlans: {
                        select: {
                            status: true,
                            booking: { select: { guestsCount: true } },
                        },
                    },
                },
                orderBy: { confirmationDeadline: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.db.tripSession.count({ where }),
        ]);
        const data = sessions.map((session) => ({
            sessionId: session.id,
            tripTitle: session.template.title,
            agencyName: session.template.agency?.companyName ?? null,
            startDate: session.startDate,
            confirmationDeadline: session.confirmationDeadline,
            minBookings: session.minBookings,
            paidParticipants: session.paymentPlans
                .filter((plan) => COUNTED_PLAN_STATUSES.includes(plan.status))
                .reduce((sum, plan) => sum + plan.booking.guestsCount, 0),
            depositPaidBookings: session.paymentPlans.filter(
                (plan) => plan.status === BookingPaymentPlanStatus.DEPOSIT_PAID,
            ).length,
            currency: session.currency,
        }));
        return {
            data,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async forceConfirmGroup(actor: InterventionActor, sessionId: string, reasonRaw: string) {
        const reason = this.requireReason(reasonRaw);
        const result = await this.db.$transaction(async (tx) => {
            const outcome = await this.stagedPaymentsService.forceConfirmGroupInTransaction(
                tx,
                sessionId,
            );
            await this.audit(tx, actor, 'ADMIN_GROUP_FORCE_CONFIRMED', 'TRIP_SESSION', sessionId, {
                reason,
                intervention: 'force-confirm-group',
                participants: outcome.participants,
                minBookings: outcome.minBookings,
                belowMinimum: outcome.participants < outcome.minBookings,
                before: { groupStatus: SessionGroupStatus.PENDING_MINIMUM },
                after: { groupStatus: SessionGroupStatus.CONFIRMED },
            });
            return outcome;
        });
        return {
            sessionId,
            groupStatus: SessionGroupStatus.CONFIRMED,
            participants: result.participants,
            minBookings: result.minBookings,
        };
    }

    async closeGroup(actor: InterventionActor, sessionId: string, reasonRaw: string) {
        const reason = this.requireReason(reasonRaw);
        const result = await this.db.$transaction(async (tx) => {
            const outcome = await this.stagedPaymentsService.closeGroupInTransaction(
                tx,
                sessionId,
            );
            await this.audit(tx, actor, 'ADMIN_GROUP_CLOSED', 'TRIP_SESSION', sessionId, {
                reason,
                intervention: 'close-group',
                depositPaidBookings: outcome.depositPaidBookings,
                refundCasesCreated: outcome.depositPaidBookings,
                cancelledBookings: outcome.unpaidBookings,
                before: { groupStatus: SessionGroupStatus.PENDING_MINIMUM },
                after: { groupStatus: SessionGroupStatus.NOT_CONFIRMED },
            });
            return outcome;
        });
        // #419 (Council P0-16): closing the group opened refund cases —
        // tell the travellers owed money (post-commit, best-effort; the
        // deadline cascade path notifies the same way).
        await this.refundsService
            .notifyTravelersRefundDueForSession(sessionId)
            .catch(() => undefined);
        return {
            sessionId,
            groupStatus: SessionGroupStatus.NOT_CONFIRMED,
            depositPaidBookings: result.depositPaidBookings,
            cancelledBookings: result.unpaidBookings,
        };
    }

    async extendDeadline(
        actor: InterventionActor,
        sessionId: string,
        newDeadlineRaw: string,
        reasonRaw: string,
    ) {
        const reason = this.requireReason(reasonRaw);
        const newDeadline = new Date(newDeadlineRaw);
        if (Number.isNaN(newDeadline.getTime())) {
            throw new BadRequestException('newDeadline must be a valid date');
        }
        const result = await this.db.$transaction(async (tx) => {
            const outcome = await this.stagedPaymentsService
                .extendConfirmationDeadlineInTransaction(tx, sessionId, newDeadline);
            await this.audit(tx, actor, 'ADMIN_DEADLINE_EXTENDED', 'TRIP_SESSION', sessionId, {
                reason,
                intervention: 'extend-deadline',
                previousDeadline: outcome.previousDeadline?.toISOString() ?? null,
                newDeadline: outcome.newDeadline.toISOString(),
                plansUpdated: outcome.plansUpdated,
            });
            return outcome;
        });
        return {
            sessionId,
            confirmationDeadline: result.newDeadline,
            plansUpdated: result.plansUpdated,
        };
    }

    // ------------------------------------------------------------------
    // Booking repairs — named actions only, never a status setter.
    // ------------------------------------------------------------------

    async repairBooking(
        actor: InterventionActor,
        bookingId: string,
        action: BookingRepairAction,
        reasonRaw: string,
    ) {
        const reason = this.requireReason(reasonRaw);
        return this.db.$transaction(async (tx) => {
            const booking = await tx.booking.findUnique({
                where: { id: bookingId },
                include: { paymentPlan: true, paymentProof: true },
            });
            if (!booking) {
                throw new NotFoundException('Booking not found');
            }
            switch (action) {
                case 'resync-payment-state':
                    return this.resyncPaymentState(tx, actor, booking, reason);
                case 'requeue-proof-review':
                    return this.requeueProofReview(tx, actor, booking, reason);
                case 'open-refund-case':
                    return this.openRefundCase(tx, actor, booking, reason);
                default:
                    throw new BadRequestException(`Unknown booking repair action: ${action}`);
            }
        });
    }

    /**
     * Recompute Booking.status / paymentStatus / refundStatus from the
     * authoritative trio: the payment plan, the verified external
     * payments, and the refund cases. Fixes the known divergence class
     * (e.g. #412: a fully-refunded booking still reading CONFIRMED/PAID).
     * Idempotent — running it on an in-sync booking changes nothing.
     */
    private async resyncPaymentState(
        tx: Tx,
        actor: InterventionActor,
        booking: {
            id: string;
            status: BookingStatus;
            paymentStatus: BookingPaymentStatus;
            refundStatus: RefundStatus | null;
            paymentPlan: { status: BookingPaymentPlanStatus } | null;
        },
        reason: string,
    ) {
        const payments = await tx.externalPayment.findMany({
            where: { bookingId: booking.id, status: ExternalPaymentStatus.VERIFIED },
        });
        const verifiedTotal = payments.reduce(
            (sum, payment) => sum.add(toMoneyDecimal(payment.amount)),
            toMoneyDecimal(0),
        );
        const completedCases = await tx.refundCase.findMany({
            where: { bookingId: booking.id, status: RefundCaseStatus.REFUND_COMPLETED },
            select: { approvedAmount: true, requestedAmount: true },
        });
        const refundedTotal = completedCases.reduce(
            (sum, refundCase) => sum.add(toMoneyDecimal(refundCase.approvedAmount ?? refundCase.requestedAmount)),
            toMoneyDecimal(0),
        );

        let status = booking.status;
        let paymentStatus = booking.paymentStatus;
        let refundStatus = booking.refundStatus;
        const statusLocked = LOCKED_BOOKING_STATUSES.includes(booking.status);
        const plan = booking.paymentPlan;

        if (plan) {
            switch (plan.status) {
                case BookingPaymentPlanStatus.FULLY_PAID:
                    if (!statusLocked) status = BookingStatus.CONFIRMED;
                    paymentStatus = BookingPaymentStatus.PAID;
                    break;
                case BookingPaymentPlanStatus.BALANCE_DUE:
                    if (!statusLocked) status = BookingStatus.CONFIRMED;
                    paymentStatus = BookingPaymentStatus.PARTIALLY_PAID;
                    break;
                case BookingPaymentPlanStatus.DEPOSIT_PAID:
                    if (!statusLocked) status = BookingStatus.PENDING_MINIMUM;
                    paymentStatus = BookingPaymentStatus.PARTIALLY_PAID;
                    break;
                case BookingPaymentPlanStatus.REFUND_DUE:
                    if (!statusLocked) status = BookingStatus.NOT_CONFIRMED;
                    paymentStatus = BookingPaymentStatus.PARTIALLY_PAID;
                    break;
                case BookingPaymentPlanStatus.REFUNDED:
                    paymentStatus = BookingPaymentStatus.REFUNDED;
                    break;
                case BookingPaymentPlanStatus.CANCELLED:
                    if (!statusLocked) status = BookingStatus.CANCELLED;
                    break;
                case BookingPaymentPlanStatus.DEPOSIT_DUE:
                    // No verified deposit yet: the booking side is
                    // driven by the proof flow, not the plan.
                    break;
            }
        } else if (payments.some((payment) => payment.stage === ExternalPaymentStage.FULL)) {
            if (!statusLocked) status = BookingStatus.CONFIRMED;
            paymentStatus = BookingPaymentStatus.PAID;
        }

        // A completed refund covering everything verified as paid wins
        // over the plan-derived payment status.
        if (verifiedTotal.greaterThan(0) && refundedTotal.greaterThanOrEqualTo(verifiedTotal)) {
            paymentStatus = BookingPaymentStatus.REFUNDED;
        }
        if (completedCases.length > 0) {
            refundStatus = RefundStatus.PROCESSED;
        }

        const before = {
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            refundStatus: booking.refundStatus,
        };
        const after = { status, paymentStatus, refundStatus };
        const changed =
            status !== booking.status
            || paymentStatus !== booking.paymentStatus
            || refundStatus !== booking.refundStatus;
        if (changed) {
            const claimed = await tx.booking.updateMany({
                where: { id: booking.id, status: booking.status },
                data: { status, paymentStatus, refundStatus },
            });
            if (claimed.count !== 1) {
                throw new ConflictException('Booking was modified concurrently');
            }
        }
        await this.audit(tx, actor, 'ADMIN_BOOKING_REPAIRED', 'BOOKING', booking.id, {
            reason,
            repairAction: 'resync-payment-state',
            changed,
            before,
            after,
        });
        return { bookingId: booking.id, action: 'resync-payment-state', changed, before, after };
    }

    /**
     * A PENDING payment proof whose booking drifted out of
     * AWAITING_VALIDATION can never be verified (the verify endpoint
     * throws). Restore the booking so the normal review flow works.
     */
    private async requeueProofReview(
        tx: Tx,
        actor: InterventionActor,
        booking: {
            id: string;
            status: BookingStatus;
            paymentStatus: BookingPaymentStatus;
            paymentProof: { status: VerificationStatus } | null;
        },
        reason: string,
    ) {
        const proof = booking.paymentProof;
        if (!proof) {
            throw new BadRequestException('Booking has no payment proof to requeue');
        }
        if (proof.status !== VerificationStatus.PENDING) {
            throw new BadRequestException('Payment proof is not pending review');
        }
        if (booking.status === BookingStatus.AWAITING_VALIDATION) {
            throw new BadRequestException('Booking is already awaiting payment validation');
        }
        const before = { status: booking.status, paymentStatus: booking.paymentStatus };
        const after = {
            status: BookingStatus.AWAITING_VALIDATION,
            paymentStatus: booking.paymentStatus,
        };
        const claimed = await tx.booking.updateMany({
            where: { id: booking.id, status: booking.status },
            data: { status: BookingStatus.AWAITING_VALIDATION },
        });
        if (claimed.count !== 1) {
            throw new ConflictException('Booking was modified concurrently');
        }
        await this.audit(tx, actor, 'ADMIN_BOOKING_REPAIRED', 'BOOKING', booking.id, {
            reason,
            repairAction: 'requeue-proof-review',
            changed: true,
            before,
            after,
        });
        return { bookingId: booking.id, action: 'requeue-proof-review', changed: true, before, after };
    }

    /**
     * On-demand version of the cron's syncRefundDueCases backstop: a
     * plan in REFUND_DUE without a case gets its RefundCase now, through
     * the same creation path the group-failure flow uses.
     */
    private async openRefundCase(
        tx: Tx,
        actor: InterventionActor,
        booking: {
            id: string;
            travelerId: string;
            paymentPlan: { status: BookingPaymentPlanStatus; agencyId: string } | null;
        },
        reason: string,
    ) {
        const plan = booking.paymentPlan;
        if (!plan) {
            throw new BadRequestException('Booking has no payment plan');
        }
        if (plan.status !== BookingPaymentPlanStatus.REFUND_DUE) {
            throw new BadRequestException('Booking payment plan is not refund-due');
        }
        const existing = await tx.refundCase.findUnique({
            where: { dedupeKey: `refund-due:${booking.id}` },
        });
        if (existing) {
            await this.audit(tx, actor, 'ADMIN_BOOKING_REPAIRED', 'BOOKING', booking.id, {
                reason,
                repairAction: 'open-refund-case',
                changed: false,
                refundCaseId: existing.id,
                note: 'Refund-due case already exists',
            });
            return {
                bookingId: booking.id,
                action: 'open-refund-case',
                changed: false,
                refundCaseId: existing.id,
            };
        }
        const active = await tx.refundCase.findFirst({
            where: { bookingId: booking.id, status: { in: REFUND_ACTIVE_STATUSES } },
            select: { id: true },
        });
        if (active) {
            throw new ConflictException('A refund case is already open for this booking');
        }
        const deposit = await tx.externalPayment.findFirst({
            where: {
                bookingId: booking.id,
                stage: ExternalPaymentStage.DEPOSIT,
                status: ExternalPaymentStatus.VERIFIED,
            },
            orderBy: { createdAt: 'asc' },
        });
        if (!deposit) {
            throw new BadRequestException('No verified deposit payment to refund for this booking');
        }
        const created = await this.refundsService.createRefundDueCaseInTransaction(tx, {
            bookingId: booking.id,
            agencyId: plan.agencyId,
            travelerId: booking.travelerId,
            payment: {
                id: deposit.id,
                amount: deposit.amount,
                currency: deposit.currency,
                externalReference: deposit.externalReference,
            },
        });
        await this.audit(tx, actor, 'ADMIN_BOOKING_REPAIRED', 'BOOKING', booking.id, {
            reason,
            repairAction: 'open-refund-case',
            changed: true,
            refundCaseId: created.id,
        });
        return {
            bookingId: booking.id,
            action: 'open-refund-case',
            changed: true,
            refundCaseId: created.id,
        };
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    private requireReason(reasonRaw: string): string {
        const reason = reasonRaw?.trim();
        if (!reason) {
            throw new BadRequestException('A reason is required for admin interventions');
        }
        return reason.slice(0, 1000);
    }

    private async audit(
        tx: Tx,
        actor: InterventionActor,
        action: string,
        targetType: string,
        targetId: string,
        metadata: Record<string, any>,
    ) {
        await tx.auditLog.create({
            data: {
                actorId: actor.id,
                actorEmail: actor.email ?? undefined,
                action,
                targetType,
                targetId,
                metadata,
            },
        });
    }
}
