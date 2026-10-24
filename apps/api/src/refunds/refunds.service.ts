import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import {
    BookingPaymentPlanStatus,
    BookingPaymentStatus,
    ExternalPaymentStage,
    ExternalPaymentStatus,
    PaymentLedgerSource,
    Prisma,
    RefundCaseStatus,
    RefundStatus,
} from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { escapeHtml, emailHeading, emailParagraph, renderEmail } from '../email/email-template';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';
import { toMoneyDecimal, toMoneyString } from '../common/money.util';
import { GROUP_MINIMUM_NOT_REACHED_REASON } from '../staged-payments/staged-payments.util';
import {
    REFUND_ACTIVE_STATUSES,
    REFUND_AGENCY_ACTION_STATUSES,
    REFUND_OVERDUE_ELIGIBLE_STATUSES,
    REFUND_POLICY_VERSION,
    REFUND_REASON_ADMIN_INITIATED,
    REFUND_REASON_AGENCY_CANCELLATION,
    REFUND_REASON_TRAVELLER_REQUEST,
    REFUND_RESTRICTION_REASON,
    REFUND_RULE_MINIMUM_NOT_REACHED,
    REFUND_SYSTEM_ACTOR,
    canTransitionRefund,
    refundDueDate,
} from './refunds.util';

/**
 * #370 — RefundCase lifecycle (plan §§13–16).
 *
 * Refunds are first-class obligations, not notes on bookings. The money is
 * always with the agency / its payment provider (Phase 1): this service
 * tracks the obligation, enforces a measurable SLA (refundDueAt), audits
 * every transition, and restricts an agency's NEW bookings when a refund
 * goes overdue. It never moves money, never credits a balance, and never
 * cancels or blocks an existing booking because of a refund.
 */

type Tx = Prisma.TransactionClient;

export interface RefundActor {
    id: string;
    email?: string | null;
}

export type RefundActorRole = 'TRAVELER' | 'AGENCY' | 'ADMIN' | 'SYSTEM';

const CASE_INCLUDE = {
    booking: {
        select: {
            id: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
            currency: true,
            guestsCount: true,
            session: {
                select: {
                    id: true,
                    startDate: true,
                    endDate: true,
                    template: {
                        select: { id: true, title: true, agencyId: true },
                    },
                },
            },
        },
    },
    agency: { select: { id: true, companyName: true } },
    traveler: { select: { id: true, name: true, email: true } },
} satisfies Prisma.RefundCaseInclude;

export function serializeRefundCase<T extends Record<string, any>>(refundCase: T) {
    return {
        ...refundCase,
        requestedAmount: toMoneyString(refundCase.requestedAmount),
        approvedAmount:
            refundCase.approvedAmount === null || refundCase.approvedAmount === undefined
                ? null
                : toMoneyString(refundCase.approvedAmount),
    };
}

export function parseRefundPagination(page?: string, limit?: string) {
    const parsedPage = Number(page);
    const parsedLimit = Number(limit);
    return {
        page: Number.isFinite(parsedPage) ? Math.max(Math.floor(parsedPage), 1) : 1,
        limit: Number.isFinite(parsedLimit)
            ? Math.min(Math.max(Math.floor(parsedLimit), 1), 100)
            : 20,
    };
}

@Injectable()
export class RefundsService {
    private readonly logger = new Logger(RefundsService.name);

    constructor(
        private db: DatabaseService,
        private externalPaymentsService: ExternalPaymentsService,
        private emailService: EmailService,
    ) { }

    // ------------------------------------------------------------------
    // Creation triggers
    // ------------------------------------------------------------------

    /**
     * Create the automatic refund case for a booking whose deposit became
     * refund-due (minimum group not reached). Called by #369 inside the
     * same transaction that flips the plan to REFUND_DUE, so the case can
     * never be lost. Idempotent via dedupeKey — safe under retries and
     * concurrent workers. Eligibility is decided by the platform rule, so
     * the case starts in AGENCY_ACTION_REQUIRED with the SLA clock running.
     */
    async createRefundDueCaseInTransaction(
        tx: Tx,
        args: {
            bookingId: string;
            agencyId: string;
            travelerId: string;
            payment: {
                id: string;
                amount: Prisma.Decimal;
                currency: string;
                externalReference: string | null;
            };
            now?: Date;
        },
    ) {
        const dedupeKey = `refund-due:${args.bookingId}`;
        const existing = await tx.refundCase.findUnique({ where: { dedupeKey } });
        if (existing) {
            return existing;
        }
        const now = args.now ?? new Date();
        const created = await tx.refundCase.create({
            data: {
                bookingId: args.bookingId,
                travelerId: args.travelerId,
                agencyId: args.agencyId,
                originalPaymentId: args.payment.id,
                externalPaymentReference: args.payment.externalReference,
                requestedAmount: toMoneyDecimal(args.payment.amount),
                approvedAmount: toMoneyDecimal(args.payment.amount),
                currency: args.payment.currency,
                reason: GROUP_MINIMUM_NOT_REACHED_REASON,
                eligibilityRule: REFUND_RULE_MINIMUM_NOT_REACHED,
                policyVersion: REFUND_POLICY_VERSION,
                status: RefundCaseStatus.AGENCY_ACTION_REQUIRED,
                requestedAt: now,
                approvedAt: now,
                agencyNotifiedAt: now,
                refundDueAt: refundDueDate(now),
                dedupeKey,
                createdBy: REFUND_SYSTEM_ACTOR,
                updatedBy: REFUND_SYSTEM_ACTOR,
            },
        });
        await this.audit(tx, { id: REFUND_SYSTEM_ACTOR }, 'REFUND_CASE_CREATED', created.id, {
            trigger: 'GROUP_MINIMUM_NOT_REACHED',
            bookingId: args.bookingId,
            amount: toMoneyString(args.payment.amount),
            currency: args.payment.currency,
        });
        return created;
    }

    /**
     * Backstop for createRefundDueCaseInTransaction: any staged plan in
     * REFUND_DUE without a case (e.g. flipped before #370 shipped) gets
     * one. Runs from the maintenance cron; idempotent.
     */
    async syncRefundDueCases(): Promise<{ created: number }> {
        const plans = await this.db.bookingPaymentPlan.findMany({
            where: { status: BookingPaymentPlanStatus.REFUND_DUE },
            select: {
                bookingId: true,
                agencyId: true,
                booking: { select: { travelerId: true } },
            },
        });
        let created = 0;
        const createdCases: Array<{ agencyId: string; bookingId: string }> = [];
        for (const plan of plans) {
            const deposit = await this.db.externalPayment.findFirst({
                where: {
                    bookingId: plan.bookingId,
                    stage: ExternalPaymentStage.DEPOSIT,
                    status: ExternalPaymentStatus.VERIFIED,
                },
            });
            if (!deposit) {
                continue; // No verified deposit: nothing is owed.
            }
            const result = await this.db.$transaction(async (tx) => {
                const before = await tx.refundCase.findUnique({
                    where: { dedupeKey: `refund-due:${plan.bookingId}` },
                });
                const refundCase = await this.createRefundDueCaseInTransaction(tx, {
                    bookingId: plan.bookingId,
                    agencyId: plan.agencyId,
                    travelerId: plan.booking.travelerId,
                    payment: {
                        id: deposit.id,
                        amount: deposit.amount,
                        currency: deposit.currency,
                        externalReference: deposit.externalReference,
                    },
                });
                return { refundCase, wasCreated: !before };
            });
            if (result.wasCreated) {
                created += 1;
                createdCases.push({ agencyId: plan.agencyId, bookingId: plan.bookingId });
            }
        }
        for (const entry of createdCases) {
            await this.notifyAgencyRefundAction(entry.agencyId, entry.bookingId).catch(
                () => undefined,
            );
        }
        return { created };
    }

    /**
     * Traveller-initiated refund request. Only bookings with money actually
     * verified as paid (to the agency) can open a case, and only one active
     * case may exist per booking.
     */
    async requestRefund(
        travelerId: string,
        input: { bookingId: string; reason?: string },
    ) {
        const booking = await this.loadBookingForCase(input.bookingId);
        if (booking.travelerId !== travelerId) {
            throw new ForbiddenException('Forbidden');
        }
        const verified = await this.sumVerifiedPayments(booking.id);
        if (!verified || verified.total.lessThanOrEqualTo(0)) {
            throw new BadRequestException(
                'No verified payment to refund for this booking',
            );
        }
        const reason = input.reason?.trim()
            ? input.reason.trim().slice(0, 500)
            : REFUND_REASON_TRAVELLER_REQUEST;
        const created = await this.db.$transaction(async (tx) => {
            await this.assertNoActiveCase(tx, booking.id);
            const refundCase = await tx.refundCase.create({
                data: {
                    bookingId: booking.id,
                    travelerId: booking.travelerId,
                    agencyId: booking.agencyId,
                    originalPaymentId: verified.primary.id,
                    externalPaymentReference: verified.primary.externalReference,
                    requestedAmount: verified.total,
                    currency: booking.currency,
                    reason,
                    policyVersion: REFUND_POLICY_VERSION,
                    status: RefundCaseStatus.REFUND_REQUESTED,
                    createdBy: travelerId,
                    updatedBy: travelerId,
                },
            });
            await this.audit(tx, { id: travelerId }, 'REFUND_CASE_CREATED', refundCase.id, {
                trigger: 'TRAVELLER_REQUEST',
                bookingId: booking.id,
                amount: toMoneyString(verified.total),
                currency: booking.currency,
            });
            return refundCase;
        });
        await this.notifyAgencyRefundAction(booking.agencyId, booking.id).catch(
            () => undefined,
        );
        return serializeRefundCase(created);
    }

    /**
     * Agency- or admin-initiated case for a paid booking (agency
     * cancellation, or an admin opening one on the traveller's behalf).
     * Agency-created cases are admitted obligations: they start in
     * AGENCY_ACTION_REQUIRED with the SLA clock running. Admin-created
     * cases start in ELIGIBILITY_REVIEW.
     */
    async createCase(
        actor: RefundActor,
        role: Extract<RefundActorRole, 'AGENCY' | 'ADMIN'>,
        tenantAgencyId: string | null,
        input: { bookingId: string; reason?: string },
    ) {
        const booking = await this.loadBookingForCase(input.bookingId);
        if (role === 'AGENCY' && booking.agencyId !== tenantAgencyId) {
            throw new ForbiddenException('Forbidden');
        }
        const verified = await this.sumVerifiedPayments(booking.id);
        if (!verified || verified.total.lessThanOrEqualTo(0)) {
            throw new BadRequestException(
                'No verified payment to refund for this booking',
            );
        }
        const isAgency = role === 'AGENCY';
        const now = new Date();
        const created = await this.db.$transaction(async (tx) => {
            await this.assertNoActiveCase(tx, booking.id);
            const refundCase = await tx.refundCase.create({
                data: {
                    bookingId: booking.id,
                    travelerId: booking.travelerId,
                    agencyId: booking.agencyId,
                    originalPaymentId: verified.primary.id,
                    externalPaymentReference: verified.primary.externalReference,
                    requestedAmount: verified.total,
                    approvedAmount: isAgency ? verified.total : undefined,
                    currency: booking.currency,
                    reason:
                        input.reason?.trim().slice(0, 500) ||
                        (isAgency
                            ? REFUND_REASON_AGENCY_CANCELLATION
                            : REFUND_REASON_ADMIN_INITIATED),
                    policyVersion: REFUND_POLICY_VERSION,
                    status: isAgency
                        ? RefundCaseStatus.AGENCY_ACTION_REQUIRED
                        : RefundCaseStatus.ELIGIBILITY_REVIEW,
                    approvedAt: isAgency ? now : undefined,
                    agencyNotifiedAt: isAgency ? now : undefined,
                    refundDueAt: isAgency ? refundDueDate(now) : undefined,
                    createdBy: actor.id,
                    updatedBy: actor.id,
                },
            });
            await this.audit(tx, actor, 'REFUND_CASE_CREATED', refundCase.id, {
                trigger: isAgency ? 'AGENCY_CANCELLATION' : 'ADMIN_INITIATED',
                bookingId: booking.id,
                amount: toMoneyString(verified.total),
                currency: booking.currency,
            });
            return refundCase;
        });
        return serializeRefundCase(created);
    }

    // ------------------------------------------------------------------
    // State transitions (agency / admin)
    // ------------------------------------------------------------------

    async beginReview(actor: RefundActor, role: RefundActorRole, tenantAgencyId: string | null, caseId: string) {
        const refundCase = await this.loadCaseForActor(caseId, role, tenantAgencyId);
        const updated = await this.db.$transaction((tx) =>
            this.transitionInTransaction(tx, refundCase, RefundCaseStatus.ELIGIBILITY_REVIEW, actor, {}),
        );
        return serializeRefundCase(updated);
    }

    async approve(
        actor: RefundActor,
        role: RefundActorRole,
        tenantAgencyId: string | null,
        caseId: string,
        input: { approvedAmount?: string | number },
    ) {
        const refundCase = await this.loadCaseForActor(caseId, role, tenantAgencyId);
        const requested = toMoneyDecimal(refundCase.requestedAmount);
        const approvedAmount =
            input.approvedAmount !== undefined
                ? toMoneyDecimal(input.approvedAmount, 'approvedAmount')
                : requested;
        if (approvedAmount.lessThanOrEqualTo(0) || approvedAmount.greaterThan(requested)) {
            throw new BadRequestException(
                'approvedAmount must be greater than 0 and no more than the requested amount',
            );
        }
        const now = new Date();
        const updated = await this.db.$transaction(async (tx) => {
            const approved = await this.transitionInTransaction(
                tx,
                refundCase,
                RefundCaseStatus.REFUND_APPROVED,
                actor,
                {
                    approvedAmount,
                    approvedAt: now,
                    agencyNotifiedAt: now,
                    refundDueAt: refundDueDate(now),
                },
            );
            // Approval and agency notification are one use-case: the case
            // immediately becomes actionable by the agency, with the
            // REFUND_APPROVED step preserved in the audit trail.
            return this.transitionInTransaction(
                tx,
                approved,
                RefundCaseStatus.AGENCY_ACTION_REQUIRED,
                actor,
                {},
            );
        });
        if (role === 'ADMIN') {
            await this.notifyAgencyRefundAction(updated.agencyId, updated.bookingId).catch(
                () => undefined,
            );
        }
        return serializeRefundCase(updated);
    }

    async reject(
        actor: RefundActor,
        role: RefundActorRole,
        tenantAgencyId: string | null,
        caseId: string,
        input: { reason: string },
    ) {
        const reason = input.reason?.trim();
        if (!reason) {
            throw new BadRequestException('A rejection reason is required');
        }
        const refundCase = await this.loadCaseForActor(caseId, role, tenantAgencyId);
        const updated = await this.db.$transaction((tx) =>
            this.transitionInTransaction(tx, refundCase, RefundCaseStatus.REFUND_REJECTED, actor, {
                disputeReason: reason.slice(0, 1000),
            }),
        );
        return serializeRefundCase(updated);
    }

    async initiate(
        actor: RefundActor,
        role: RefundActorRole,
        tenantAgencyId: string | null,
        caseId: string,
        input: { providerRefundId?: string },
    ) {
        const refundCase = await this.loadCaseForActor(caseId, role, tenantAgencyId);
        const updated = await this.db.$transaction((tx) =>
            this.transitionInTransaction(tx, refundCase, RefundCaseStatus.REFUND_INITIATED, actor, {
                initiatedAt: refundCase.initiatedAt ?? new Date(),
                providerRefundId: input.providerRefundId?.trim() || refundCase.providerRefundId,
                providerStatus: 'INITIATED',
            }),
        );
        await this.refreshAgencyRestriction(updated.agencyId);
        return serializeRefundCase(updated);
    }

    async complete(
        actor: RefundActor,
        role: RefundActorRole,
        tenantAgencyId: string | null,
        caseId: string,
        input: { providerRefundId?: string; providerStatus?: string },
    ) {
        const refundCase = await this.loadCaseForActor(caseId, role, tenantAgencyId);
        const amount = toMoneyDecimal(refundCase.approvedAmount ?? refundCase.requestedAmount);
        const completed = await this.db.$transaction(async (tx) => {
            const updated = await this.transitionInTransaction(
                tx,
                refundCase,
                RefundCaseStatus.REFUND_COMPLETED,
                actor,
                {
                    initiatedAt: refundCase.initiatedAt ?? new Date(),
                    completedAt: new Date(),
                    providerRefundId:
                        input.providerRefundId?.trim() || refundCase.providerRefundId,
                    providerStatus: input.providerStatus?.trim() || 'COMPLETED',
                },
            );

            // Record the refund as an external payment fact: the agency /
            // its provider returned the money to the traveller. OuiBoo
            // only records it (ledger REFUND_COMPLETED).
            const payment = refundCase.originalPaymentId
                ? await tx.externalPayment.findUnique({
                    where: { id: refundCase.originalPaymentId },
                })
                : await tx.externalPayment.findFirst({
                    where: { bookingId: refundCase.bookingId, status: ExternalPaymentStatus.VERIFIED },
                    orderBy: { createdAt: 'asc' },
                });
            if (payment) {
                await this.externalPaymentsService.recordRefundInTransaction(tx, {
                    bookingId: refundCase.bookingId,
                    agencyId: refundCase.agencyId,
                    travelerId: refundCase.travelerId,
                    amount,
                    currency: refundCase.currency,
                    method: payment.method,
                    provider: payment.provider,
                    externalReference: payment.externalReference,
                    externalTransactionId:
                        input.providerRefundId?.trim() || refundCase.providerRefundId || null,
                    custodian: payment.custodian,
                    source: input.providerRefundId || refundCase.providerRefundId
                        ? PaymentLedgerSource.GATEWAY_REFUND
                        : PaymentLedgerSource.MANUAL_PROOF_REVIEW,
                    stage: payment.stage,
                });
            }

            // Legacy booking refund fields stay consistent for existing UI.
            const remainingVerified = await tx.externalPayment.count({
                where: {
                    bookingId: refundCase.bookingId,
                    status: ExternalPaymentStatus.VERIFIED,
                },
            });
            await tx.booking.update({
                where: { id: refundCase.bookingId },
                data: {
                    refundAmount: amount,
                    refundStatus: RefundStatus.PROCESSED,
                    refundProcessedAt: new Date(),
                    ...(remainingVerified === 0
                        ? { paymentStatus: BookingPaymentStatus.REFUNDED }
                        : {}),
                },
            });
            await tx.bookingPaymentPlan.updateMany({
                where: {
                    bookingId: refundCase.bookingId,
                    status: BookingPaymentPlanStatus.REFUND_DUE,
                },
                data: { status: BookingPaymentPlanStatus.REFUNDED },
            });
            return updated;
        });
        await this.refreshAgencyRestriction(completed.agencyId);
        return serializeRefundCase(completed);
    }

    async fail(
        actor: RefundActor,
        role: RefundActorRole,
        tenantAgencyId: string | null,
        caseId: string,
        input: { failureReason: string },
    ) {
        const failureReason = input.failureReason?.trim();
        if (!failureReason) {
            throw new BadRequestException('A failure reason is required');
        }
        const refundCase = await this.loadCaseForActor(caseId, role, tenantAgencyId);
        const updated = await this.db.$transaction(async (tx) => {
            const failed = await this.transitionInTransaction(
                tx,
                refundCase,
                RefundCaseStatus.REFUND_FAILED,
                actor,
                { failureReason: failureReason.slice(0, 1000) },
            );
            await tx.booking.update({
                where: { id: refundCase.bookingId },
                data: { refundStatus: RefundStatus.FAILED },
            });
            return failed;
        });
        // A failed case is not overdue yet, but if its deadline has already
        // passed the sweep will resurface it as REFUND_OVERDUE.
        await this.refreshAgencyRestriction(updated.agencyId);
        return serializeRefundCase(updated);
    }

    // ------------------------------------------------------------------
    // SLA sweep + escalation (plan §§15–16)
    // ------------------------------------------------------------------

    /**
     * Flip actionable cases whose refundDueAt has passed to REFUND_OVERDUE
     * and apply the enforcement ladder: the agency's NEW bookings are
     * restricted while any case is overdue. Existing bookings are never
     * read or written here — the restriction only gates booking creation.
     */
    async markOverdueCases(now: Date = new Date()): Promise<{ marked: number }> {
        const due = await this.db.refundCase.findMany({
            where: {
                status: { in: REFUND_OVERDUE_ELIGIBLE_STATUSES },
                refundDueAt: { lt: now },
                initiatedAt: null,
            },
            select: { id: true, agencyId: true, status: true },
        });
        const agencyIds = new Set<string>();
        let marked = 0;
        for (const entry of due) {
            const didMark = await this.db.$transaction(async (tx) => {
                const claimed = await tx.refundCase.updateMany({
                    where: { id: entry.id, status: entry.status },
                    data: {
                        status: RefundCaseStatus.REFUND_OVERDUE,
                        updatedBy: REFUND_SYSTEM_ACTOR,
                    },
                });
                if (claimed.count !== 1) {
                    return false;
                }
                await this.audit(
                    tx,
                    { id: REFUND_SYSTEM_ACTOR },
                    'REFUND_CASE_TRANSITION',
                    entry.id,
                    { from: entry.status, to: RefundCaseStatus.REFUND_OVERDUE, trigger: 'SLA_OVERDUE' },
                );
                return true;
            });
            if (didMark) {
                marked += 1;
                agencyIds.add(entry.agencyId);
            }
        }
        for (const agencyId of agencyIds) {
            await this.refreshAgencyRestriction(agencyId);
        }
        return { marked };
    }

    /**
     * Recompute an agency's new-bookings restriction from its overdue
     * cases. Sets the flag while at least one case is REFUND_OVERDUE and
     * clears it (only if the refund system set it) once none remain.
     * Never touches bookings.
     */
    async refreshAgencyRestriction(agencyId: string): Promise<void> {
        const [overdueCount, agency] = await Promise.all([
            this.db.refundCase.count({
                where: { agencyId, status: RefundCaseStatus.REFUND_OVERDUE },
            }),
            this.db.agencyProfile.findUnique({
                where: { id: agencyId },
                select: {
                    id: true,
                    newBookingsRestrictedAt: true,
                    newBookingsRestrictionReason: true,
                },
            }),
        ]);
        if (!agency) {
            return;
        }
        if (overdueCount > 0 && !agency.newBookingsRestrictedAt) {
            await this.db.$transaction(async (tx) => {
                await tx.agencyProfile.update({
                    where: { id: agencyId },
                    data: {
                        newBookingsRestrictedAt: new Date(),
                        newBookingsRestrictionReason: REFUND_RESTRICTION_REASON,
                    },
                });
                await this.audit(
                    tx,
                    { id: REFUND_SYSTEM_ACTOR },
                    'REFUND_AGENCY_RESTRICTED',
                    agencyId,
                    { agencyId, overdueCases: overdueCount, reason: REFUND_RESTRICTION_REASON },
                    'AGENCY_PROFILE',
                );
            });
        } else if (
            overdueCount === 0
            && agency.newBookingsRestrictedAt
            && agency.newBookingsRestrictionReason === REFUND_RESTRICTION_REASON
        ) {
            await this.db.$transaction(async (tx) => {
                await tx.agencyProfile.update({
                    where: { id: agencyId },
                    data: {
                        newBookingsRestrictedAt: null,
                        newBookingsRestrictionReason: null,
                    },
                });
                await this.audit(
                    tx,
                    { id: REFUND_SYSTEM_ACTOR },
                    'REFUND_AGENCY_RESTRICTION_CLEARED',
                    agencyId,
                    { agencyId },
                    'AGENCY_PROFILE',
                );
            });
        }
    }

    // ------------------------------------------------------------------
    // Queries
    // ------------------------------------------------------------------

    async listTravelerCases(
        travelerId: string,
        query: { page?: string; limit?: string } = {},
    ) {
        const { page, limit } = parseRefundPagination(query.page, query.limit);
        const where: Prisma.RefundCaseWhereInput = { travelerId };
        const [cases, total] = await Promise.all([
            this.db.refundCase.findMany({
                where,
                include: CASE_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.db.refundCase.count({ where }),
        ]);
        return {
            data: cases.map(serializeRefundCase),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async listAgencyCases(
        agencyId: string,
        query: { page?: string; limit?: string; status?: string },
    ) {
        const { page, limit } = parseRefundPagination(query.page, query.limit);
        const status = this.parseStatusFilter(query.status);
        const where: Prisma.RefundCaseWhereInput = {
            agencyId,
            ...(status ? { status } : {}),
        };
        const [cases, total] = await Promise.all([
            this.db.refundCase.findMany({
                where,
                include: CASE_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.db.refundCase.count({ where }),
        ]);
        return {
            data: cases.map(serializeRefundCase),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async countAgencyActionRequired(agencyId: string): Promise<{ count: number }> {
        const count = await this.db.refundCase.count({
            where: { agencyId, status: { in: REFUND_AGENCY_ACTION_STATUSES } },
        });
        return { count };
    }

    async listAdminCases(query: {
        page?: string;
        limit?: string;
        status?: string;
        agencyId?: string;
    }) {
        const { page, limit } = parseRefundPagination(query.page, query.limit);
        const status = this.parseStatusFilter(query.status);
        const where: Prisma.RefundCaseWhereInput = {
            ...(status ? { status } : {}),
            ...(query.agencyId ? { agencyId: query.agencyId } : {}),
        };
        const [cases, total] = await Promise.all([
            this.db.refundCase.findMany({
                where,
                include: CASE_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.db.refundCase.count({ where }),
        ]);
        return {
            data: cases.map(serializeRefundCase),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getCaseForActor(caseId: string, role: RefundActorRole, tenantAgencyId: string | null) {
        const refundCase = await this.loadCaseForActor(caseId, role, tenantAgencyId);
        return serializeRefundCase(refundCase);
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    private parseStatusFilter(status?: string): RefundCaseStatus | undefined {
        if (!status) {
            return undefined;
        }
        if (!(Object.values(RefundCaseStatus) as string[]).includes(status)) {
            throw new BadRequestException(`Unknown refund case status: ${status}`);
        }
        return status as RefundCaseStatus;
    }

    private async loadBookingForCase(bookingId: string) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                session: {
                    include: {
                        template: { select: { agencyId: true, title: true } },
                    },
                },
            },
        });
        if (!booking) {
            throw new BadRequestException('Booking not found');
        }
        return {
            ...booking,
            agencyId: booking.session.template.agencyId,
            tripTitle: booking.session.template.title,
        };
    }

    private async sumVerifiedPayments(bookingId: string) {
        const payments = await this.db.externalPayment.findMany({
            where: { bookingId, status: ExternalPaymentStatus.VERIFIED },
            orderBy: { createdAt: 'asc' },
        });
        if (payments.length === 0) {
            return null;
        }
        const total = payments.reduce(
            (sum, payment) => sum.add(toMoneyDecimal(payment.amount)),
            toMoneyDecimal(0),
        );
        // Prefer the FULL-stage payment as the refund's origin; staged
        // bookings refund the deposit stage first.
        const primary =
            payments.find((p) => p.stage === ExternalPaymentStage.FULL) ?? payments[0];
        return { total, primary, payments };
    }

    private async assertNoActiveCase(tx: Tx, bookingId: string) {
        const active = await tx.refundCase.findFirst({
            where: { bookingId, status: { in: REFUND_ACTIVE_STATUSES } },
            select: { id: true },
        });
        if (active) {
            throw new ConflictException(
                'A refund case is already open for this booking',
            );
        }
    }

    private async loadCaseForActor(
        caseId: string,
        role: RefundActorRole,
        tenantAgencyId: string | null,
    ) {
        const refundCase = await this.db.refundCase.findUnique({
            where: { id: caseId },
            include: CASE_INCLUDE,
        });
        if (!refundCase) {
            throw new NotFoundException('Refund case not found');
        }
        if (role === 'AGENCY' && refundCase.agencyId !== tenantAgencyId) {
            throw new ForbiddenException('Forbidden');
        }
        if (role === 'TRAVELER' && refundCase.travelerId !== tenantAgencyId) {
            throw new ForbiddenException('Forbidden');
        }
        return refundCase;
    }

    /**
     * Claim a transition atomically: the update only applies while the
     * case is still in its current status, and every successful
     * transition writes an audit row in the same transaction.
     */
    private async transitionInTransaction(
        tx: Tx,
        refundCase: { id: string; status: RefundCaseStatus },
        to: RefundCaseStatus,
        actor: RefundActor,
        patch: Prisma.RefundCaseUpdateManyMutationInput,
    ) {
        if (!canTransitionRefund(refundCase.status, to)) {
            throw new BadRequestException(
                `Refund case cannot move from ${refundCase.status} to ${to}`,
            );
        }
        const claimed = await tx.refundCase.updateMany({
            where: { id: refundCase.id, status: refundCase.status },
            data: { ...patch, status: to, updatedBy: actor.id },
        });
        if (claimed.count !== 1) {
            throw new ConflictException('Refund case was modified concurrently');
        }
        await this.audit(tx, actor, 'REFUND_CASE_TRANSITION', refundCase.id, {
            from: refundCase.status,
            to,
        });
        return tx.refundCase.findUniqueOrThrow({
            where: { id: refundCase.id },
            include: CASE_INCLUDE,
        });
    }

    private async audit(
        tx: Tx,
        actor: RefundActor,
        action: string,
        targetId: string,
        metadata?: Record<string, any>,
        targetType: string = 'REFUND_CASE',
    ) {
        await tx.auditLog.create({
            data: {
                actorId: actor.id,
                actorEmail: actor.email ?? undefined,
                action,
                targetType,
                targetId,
                metadata: metadata ?? undefined,
            },
        });
    }

    /**
     * Best-effort agency notification (the system of record is the agency
     * dashboard + RefundCase.agencyNotifiedAt). Never throws.
     */
    private async notifyAgencyRefundAction(agencyId: string, bookingId: string) {
        const agency = await this.db.agencyProfile.findUnique({
            where: { id: agencyId },
            include: { user: { select: { email: true, name: true } } },
        });
        const email = agency?.user?.email;
        if (!email) {
            return;
        }
        const appUrl = process.env.AGENCY_APP_URL || 'https://ouiboo-agency.vercel.app';
        const html = renderEmail({
            title: 'Refund action required',
            preheader: 'A refund case needs your action in OuiBoo.',
            content:
                emailHeading('Refund action required') +
                emailParagraph(
                    `A refund case for booking ${escapeHtml(bookingId)} needs your action. ` +
                    'Traveller payments are made directly to your agency, so the refund is ' +
                    'processed by your agency — please review the case and initiate the refund ' +
                    'before its deadline to avoid restrictions on new bookings.',
                ) +
                emailParagraph(`Open your refunds dashboard: ${escapeHtml(`${appUrl}/dashboard/refunds`)}`),
        });
        await this.emailService.sendEmail(email, 'Refund action required', html);
    }
}
