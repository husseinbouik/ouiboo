import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
    BookingPaymentPlanStatus,
    BookingPaymentStatus,
    BookingStatus,
    ExternalPaymentStage,
    PaymentCustodian,
    PaymentLedgerEntryType,
    PaymentLedgerSource,
    PaymentMethod,
    Prisma,
    SessionGroupStatus,
} from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';
import { RefundsService } from '../refunds/refunds.service';
import { multiplyMoney } from '../common/money.util';
import {
    GROUP_MINIMUM_NOT_REACHED_REASON,
    PAYMENT_POLICY_VERSION,
    REFUND_POLICY_VERSION,
    isStagedSessionConfig,
} from './staged-payments.util';

/**
 * #369 — staged payments (plan §§9–11, 25–27).
 *
 * For minimum-group trips the traveller pays a capped deposit first and
 * the balance only after the trip is confirmed. All money flows directly
 * to the agency; this service moves booking/plan/session state and records
 * the payment facts through ExternalPaymentsService. It never holds,
 * credits, or pays out traveller money.
 *
 * Status mapping (plan → implementation):
 * - Booking PENDING_MINIMUM  = deposit verified, waiting for the group
 *   outcome (plan status DEPOSIT_PAID).
 * - Session groupStatus CONFIRMED = minimum reached: bookings become
 *   CONFIRMED and their plans BALANCE_DUE (balanceDueAt = session start).
 * - Session groupStatus NOT_CONFIRMED = deadline passed, minimum unmet:
 *   deposit-paid bookings become NOT_CONFIRMED and their plans REFUND_DUE
 *   (a REFUND_DUE ledger entry is the trigger #370's RefundCase consumes);
 *   the balance is never collected.
 */

type Tx = Prisma.TransactionClient;

interface SessionForPlan {
    id: string;
    deposit: Prisma.Decimal;
    minBookings: number;
    confirmationDeadline: Date | null;
    currency: string;
}

interface BookingForDecision {
    id: string;
    sessionId: string;
    travelerId: string;
    currency: string;
    paymentMethod: PaymentMethod;
    status: string;
}

interface PlanForDecision {
    id: string;
    bookingId: string;
    sessionId: string;
    agencyId: string;
    status: BookingPaymentPlanStatus;
    depositAmount: Prisma.Decimal;
    balanceAmount: Prisma.Decimal;
    currency: string;
}

export interface ProofDecisionResult {
    stage: ExternalPaymentStage;
    fullyPaid: boolean;
    bookingStatus: BookingStatus;
    planStatus: BookingPaymentPlanStatus;
}

export type GroupEvaluationOutcome =
    | 'not-pending'
    | 'still-pending'
    | 'confirmed'
    | 'not-confirmed';

const COUNTED_PLAN_STATUSES: BookingPaymentPlanStatus[] = [
    BookingPaymentPlanStatus.DEPOSIT_PAID,
    BookingPaymentPlanStatus.BALANCE_DUE,
    BookingPaymentPlanStatus.FULLY_PAID,
];

@Injectable()
export class StagedPaymentsService {
    private readonly logger = new Logger(StagedPaymentsService.name);

    constructor(
        private db: DatabaseService,
        private externalPaymentsService: ExternalPaymentsService,
        private refundsService: RefundsService,
    ) { }

    /** Whether a session row uses staged payments. */
    isStagedSession(session: { minBookings: number; deposit: Prisma.Decimal }): boolean {
        return isStagedSessionConfig(session.minBookings, session.deposit);
    }

    /**
     * Snapshot a booking's payment plan at creation time. Amounts derive
     * from the session configuration (deposit is per seat), never from
     * client input.
     */
    async createPlanInTransaction(
        tx: Tx,
        args: {
            bookingId: string;
            agencyId: string;
            guestsCount: number;
            totalAmount: Prisma.Decimal;
            session: SessionForPlan;
            // #695: when a pricing selection repriced the booking, the
            // deposit is capped at the platform percent of the FINAL
            // total (the per-seat session deposit may exceed it for a
            // cheaper variant).
            depositAmountCap?: Prisma.Decimal;
        },
    ) {
        const session = args.session;
        if (!session.confirmationDeadline) {
            throw new BadRequestException(
                'Staged session is missing its confirmation deadline',
            );
        }
        let depositAmount = multiplyMoney(session.deposit, args.guestsCount);
        if (args.depositAmountCap && depositAmount.greaterThan(args.depositAmountCap)) {
            depositAmount = args.depositAmountCap;
        }
        const balanceAmount = args.totalAmount.sub(depositAmount).toDecimalPlaces(2);
        if (balanceAmount.lessThan(0)) {
            throw new BadRequestException('Deposit cannot exceed the booking total');
        }

        return tx.bookingPaymentPlan.create({
            data: {
                bookingId: args.bookingId,
                sessionId: session.id,
                agencyId: args.agencyId,
                totalAmount: args.totalAmount,
                depositAmount,
                balanceAmount,
                currency: session.currency || 'MAD',
                minimumParticipants: session.minBookings,
                confirmationDeadline: session.confirmationDeadline,
                status: BookingPaymentPlanStatus.DEPOSIT_DUE,
                paymentPolicyVersion: PAYMENT_POLICY_VERSION,
                refundPolicyVersion: REFUND_POLICY_VERSION,
            },
        });
    }

    /** The stage a plan is currently awaiting payment for, if any. */
    private stageForPlan(plan: PlanForDecision): ExternalPaymentStage {
        const stage = plan.status === BookingPaymentPlanStatus.DEPOSIT_DUE
            ? ExternalPaymentStage.DEPOSIT
            : plan.status === BookingPaymentPlanStatus.BALANCE_DUE
                ? ExternalPaymentStage.BALANCE
                : null;
        if (!stage) {
            throw new BadRequestException('Booking is not awaiting a staged payment');
        }
        return stage;
    }

    private stageRecordInput(
        booking: BookingForDecision,
        plan: PlanForDecision,
        stage: ExternalPaymentStage,
        source: PaymentLedgerSource,
        externalReference: string,
    ) {
        return {
            bookingId: booking.id,
            agencyId: plan.agencyId,
            travelerId: booking.travelerId,
            amount: stage === ExternalPaymentStage.DEPOSIT
                ? plan.depositAmount
                : plan.balanceAmount,
            currency: plan.currency,
            method: booking.paymentMethod ?? PaymentMethod.MANUAL,
            externalReference,
            custodian: PaymentCustodian.AGENCY,
            source,
            stage,
        };
    }

    /**
     * Apply an agency/admin proof REJECTION to a STAGED booking. The caller
     * has already claimed the PaymentProof (PENDING → REJECTED) inside the
     * same transaction. Rejection is one-step and safe: no money is treated
     * as received. (#422 split this from bank confirmation: accepting a
     * proof image settles nothing, so approval no longer lives here.)
     */
    async applyProofRejectionInTransaction(
        tx: Tx,
        args: {
            booking: BookingForDecision;
            plan: PlanForDecision;
            source: PaymentLedgerSource;
            externalReference: string;
        },
    ): Promise<ProofDecisionResult> {
        const { booking, plan, source, externalReference } = args;
        const stage = this.stageForPlan(plan);
        const recordInput = this.stageRecordInput(booking, plan, stage, source, externalReference);

        await this.externalPaymentsService.recordPaymentRejectedInTransaction(tx, recordInput);
        if (stage === ExternalPaymentStage.DEPOSIT) {
            await this.claimBookingUpdate(tx, booking.id, {
                status: BookingStatus.REJECTED,
                paymentStatus: BookingPaymentStatus.FAILED,
            });
            return {
                stage,
                fullyPaid: false,
                bookingStatus: BookingStatus.REJECTED,
                planStatus: plan.status,
            };
        }
        // Balance proof rejected: the booking stays confirmed with the
        // deposit paid; the traveller may upload a new balance proof.
        await this.claimBookingUpdate(tx, booking.id, {
            status: BookingStatus.CONFIRMED,
            paymentStatus: BookingPaymentStatus.PARTIALLY_PAID,
        });
        return {
            stage,
            fullyPaid: false,
            bookingStatus: BookingStatus.CONFIRMED,
            planStatus: plan.status,
        };
    }

    /**
     * #422 (Council P0-20): apply an agency BANK CONFIRMATION to a STAGED
     * booking. The caller has already claimed the PaymentProof
     * (ACCEPTED → VERIFIED) inside the same transaction and validated that
     * confirmedAmount equals the stage amount. This performs exactly the
     * effects proof approval used to perform — stage payment VERIFIED with
     * a capture ledger entry, plan/booking transitions, group evaluation —
     * except the recorded amount is the bank credit the agency observed
     * (confirmedAmount), stamped with its bank reference.
     * The stage is derived from the plan status, so a balance can never be
     * recorded before confirmation.
     */
    async applyBankConfirmationInTransaction(
        tx: Tx,
        args: {
            booking: BookingForDecision;
            plan: PlanForDecision;
            source: PaymentLedgerSource;
            externalReference: string;
            confirmedAmount: Prisma.Decimal;
            bankReference: string;
            bankConfirmedBy: string;
        },
    ): Promise<ProofDecisionResult> {
        const { booking, plan, source, externalReference } = args;

        const stage = this.stageForPlan(plan);

        const recordInput = {
            ...this.stageRecordInput(booking, plan, stage, source, externalReference),
            amount: args.confirmedAmount,
            bankReference: args.bankReference,
            bankConfirmedBy: args.bankConfirmedBy,
        };

        const entryType = stage === ExternalPaymentStage.DEPOSIT
            ? PaymentLedgerEntryType.DEPOSIT_CAPTURED
            : PaymentLedgerEntryType.BALANCE_CAPTURED;
        await this.externalPaymentsService.recordPaymentVerifiedInTransaction(
            tx,
            recordInput,
            entryType,
        );

        if (stage === ExternalPaymentStage.BALANCE) {
            await tx.bookingPaymentPlan.update({
                where: { id: plan.id },
                data: { status: BookingPaymentPlanStatus.FULLY_PAID },
            });
            await this.claimBookingUpdate(tx, booking.id, {
                status: BookingStatus.CONFIRMED,
                paymentStatus: BookingPaymentStatus.PAID,
                confirmedAt: new Date(),
            });
            return {
                stage,
                fullyPaid: true,
                bookingStatus: BookingStatus.CONFIRMED,
                planStatus: BookingPaymentPlanStatus.FULLY_PAID,
            };
        }

        // Deposit bank-confirmed.
        await tx.bookingPaymentPlan.update({
            where: { id: plan.id },
            data: { status: BookingPaymentPlanStatus.DEPOSIT_PAID },
        });
        await this.claimBookingUpdate(tx, booking.id, {
            status: BookingStatus.PENDING_MINIMUM,
            paymentStatus: BookingPaymentStatus.PARTIALLY_PAID,
        });

        const session = await tx.tripSession.findUnique({
            where: { id: booking.sessionId },
        });
        if (session?.groupStatus === SessionGroupStatus.NOT_CONFIRMED) {
            // The group already failed (e.g. the proof was under review
            // when the deadline passed): the deposit is refund-due.
            await this.markBookingRefundDueInTransaction(tx, {
                bookingId: booking.id,
                sessionId: booking.sessionId,
                travelerId: booking.travelerId,
                guestsCount: await this.bookingGuests(tx, booking.id),
                planId: plan.id,
                plan,
                source,
                restoreSeats: true,
            });
            return {
                stage,
                fullyPaid: false,
                bookingStatus: BookingStatus.NOT_CONFIRMED,
                planStatus: BookingPaymentPlanStatus.REFUND_DUE,
            };
        }

        await this.evaluateSessionGroupInTransaction(tx, booking.sessionId);
        const freshPlan = await tx.bookingPaymentPlan.findUniqueOrThrow({
            where: { id: plan.id },
        });
        const freshBooking = await tx.booking.findUniqueOrThrow({
            where: { id: booking.id },
            select: { status: true },
        });
        return {
            stage,
            fullyPaid: false,
            bookingStatus: freshBooking.status,
            planStatus: freshPlan.status,
        };
    }

    /**
     * Evaluate one session's minimum-group condition. Confirms the group
     * when enough deposit-paid participants exist before the deadline;
     * fails it when the deadline has passed with the minimum unmet.
     * Idempotent and safe to call from payment verification or the
     * deadline job.
     */
    async evaluateSessionGroupInTransaction(
        tx: Tx,
        sessionId: string,
        now: Date = new Date(),
    ): Promise<GroupEvaluationOutcome> {
        const session = await tx.tripSession.findUnique({ where: { id: sessionId } });
        if (!session || session.groupStatus !== SessionGroupStatus.PENDING_MINIMUM) {
            return 'not-pending';
        }

        const countedPlans = await tx.bookingPaymentPlan.findMany({
            where: { sessionId, status: { in: COUNTED_PLAN_STATUSES } },
            include: { booking: { select: { id: true, guestsCount: true, status: true } } },
        });
        const validParticipants = countedPlans.reduce(
            (sum, plan) => sum + plan.booking.guestsCount,
            0,
        );
        const deadlinePassed = !!session.confirmationDeadline
            && now > session.confirmationDeadline;

        if (validParticipants >= session.minBookings && !deadlinePassed) {
            await this.confirmGroupInTransaction(tx, session, now);
            return 'confirmed';
        }
        if (deadlinePassed) {
            await this.failGroupInTransaction(tx, session);
            return 'not-confirmed';
        }
        return 'still-pending';
    }

    /**
     * Deadline job entry point: evaluate every staged session whose
     * confirmation deadline has passed. Idempotent (sessions leave
     * PENDING_MINIMUM once evaluated) and per-session isolated.
     */
    async evaluateConfirmationDeadlines(now: Date = new Date()) {
        const sessions = await this.db.tripSession.findMany({
            where: {
                groupStatus: SessionGroupStatus.PENDING_MINIMUM,
                confirmationDeadline: { lte: now },
            },
            select: { id: true },
            take: 500,
        });

        let confirmed = 0;
        let notConfirmed = 0;
        for (const session of sessions) {
            try {
                const outcome = await this.db.$transaction((tx) =>
                    this.evaluateSessionGroupInTransaction(tx, session.id, now),
                );
                if (outcome === 'confirmed') confirmed += 1;
                if (outcome === 'not-confirmed') {
                    notConfirmed += 1;
                    // #419 (Council P0-16): the cascade opened refund
                    // cases — the travellers owed money must hear it
                    // (previously only the agency was ever notified).
                    // Post-commit and best-effort: a notification
                    // failure never fails the deadline evaluation.
                    await this.refundsService
                        .notifyTravelersRefundDueForSession(session.id)
                        .catch(() => undefined);
                }
            } catch (error) {
                this.logger.error(
                    `Group confirmation evaluation failed for session ${session.id}`,
                    error,
                );
            }
        }

        this.logger.log(
            `Group confirmation deadlines evaluated: ${sessions.length} sessions (${confirmed} confirmed, ${notConfirmed} not confirmed)`,
        );
        return { evaluated: sessions.length, confirmed, notConfirmed };
    }

    // ------------------------------------------------------------------
    // #423: admin stuck-state interventions. These are thin, guarded
    // wrappers over the private group state machine below — the admin
    // layer (AdminInterventionsService) owns the transaction, the
    // mandatory reason, and the AuditLog row; these methods only move
    // state, exactly like the proof-decision and deadline paths do.
    // ------------------------------------------------------------------

    /**
     * Force-confirm a session still waiting for its minimum group,
     * deliberately ignoring both the deadline and the minimum count —
     * that override is the intervention. Effects are the standard
     * confirmation effects (see confirmGroupInTransaction).
     */
    async forceConfirmGroupInTransaction(
        tx: Tx,
        sessionId: string,
        now: Date = new Date(),
    ): Promise<{ participants: number; minBookings: number }> {
        const session = await this.loadPendingGroupSession(tx, sessionId);
        const participants = await this.countGroupParticipants(tx, sessionId);
        await this.confirmGroupInTransaction(tx, session, now);
        return { participants, minBookings: session.minBookings };
    }

    /**
     * Close a pending-minimum group as NOT_CONFIRMED. Deposit-paid
     * bookings become refund-due and their RefundCase is created in the
     * same transaction (via failGroupInTransaction), never left to the
     * cron backstop; unpaid bookings are cancelled.
     */
    async closeGroupInTransaction(
        tx: Tx,
        sessionId: string,
    ): Promise<{ depositPaidBookings: number; unpaidBookings: number }> {
        const session = await this.loadPendingGroupSession(tx, sessionId);
        const plans = await tx.bookingPaymentPlan.findMany({
            where: {
                sessionId,
                status: {
                    in: [
                        BookingPaymentPlanStatus.DEPOSIT_PAID,
                        BookingPaymentPlanStatus.DEPOSIT_DUE,
                    ],
                },
            },
            include: { booking: { select: { status: true } } },
        });
        const depositPaidBookings = plans.filter(
            (plan) => plan.status === BookingPaymentPlanStatus.DEPOSIT_PAID,
        ).length;
        const unpaidBookings = plans.filter(
            (plan) => plan.status === BookingPaymentPlanStatus.DEPOSIT_DUE
                && plan.booking.status === BookingStatus.PENDING,
        ).length;
        await this.failGroupInTransaction(tx, session);
        return { depositPaidBookings, unpaidBookings };
    }

    /**
     * Move a pending group's confirmation deadline. The session row and
     * every non-terminal plan snapshot move together — the plan snapshot
     * is what refund/eligibility logic reads, so the two must never
     * diverge. The new deadline must be in the future and strictly
     * before the session start date.
     */
    async extendConfirmationDeadlineInTransaction(
        tx: Tx,
        sessionId: string,
        newDeadline: Date,
        now: Date = new Date(),
    ): Promise<{ previousDeadline: Date | null; newDeadline: Date; plansUpdated: number }> {
        const session = await this.loadPendingGroupSession(tx, sessionId);
        if (newDeadline.getTime() <= now.getTime()) {
            throw new BadRequestException('The new confirmation deadline must be in the future');
        }
        if (newDeadline.getTime() >= session.startDate.getTime()) {
            throw new BadRequestException(
                'The confirmation deadline cannot be on or after the session start date',
            );
        }
        const previousDeadline = session.confirmationDeadline;
        await tx.tripSession.update({
            where: { id: sessionId },
            data: { confirmationDeadline: newDeadline },
        });
        const plans = await tx.bookingPaymentPlan.updateMany({
            where: {
                sessionId,
                status: {
                    in: [
                        BookingPaymentPlanStatus.DEPOSIT_DUE,
                        BookingPaymentPlanStatus.DEPOSIT_PAID,
                        BookingPaymentPlanStatus.BALANCE_DUE,
                        BookingPaymentPlanStatus.FULLY_PAID,
                        BookingPaymentPlanStatus.REFUND_DUE,
                    ],
                },
            },
            data: { confirmationDeadline: newDeadline },
        });
        return { previousDeadline, newDeadline, plansUpdated: plans.count };
    }

    private async loadPendingGroupSession(tx: Tx, sessionId: string) {
        const session = await tx.tripSession.findUnique({ where: { id: sessionId } });
        if (!session) {
            throw new NotFoundException('Trip session not found');
        }
        if (session.groupStatus !== SessionGroupStatus.PENDING_MINIMUM) {
            throw new BadRequestException('Session group is not pending its minimum');
        }
        return session;
    }

    private async countGroupParticipants(tx: Tx, sessionId: string): Promise<number> {
        const countedPlans = await tx.bookingPaymentPlan.findMany({
            where: { sessionId, status: { in: COUNTED_PLAN_STATUSES } },
            include: { booking: { select: { guestsCount: true } } },
        });
        return countedPlans.reduce((sum, plan) => sum + plan.booking.guestsCount, 0);
    }

    private async confirmGroupInTransaction(
        tx: Tx,
        session: { id: string; startDate: Date },
        now: Date,
    ) {
        const claimed = await tx.tripSession.updateMany({
            where: { id: session.id, groupStatus: SessionGroupStatus.PENDING_MINIMUM },
            data: { groupStatus: SessionGroupStatus.CONFIRMED },
        });
        if (claimed.count !== 1) return;

        const waitingPlans = await tx.bookingPaymentPlan.findMany({
            where: {
                sessionId: session.id,
                status: BookingPaymentPlanStatus.DEPOSIT_PAID,
            },
            include: { booking: { select: { id: true, status: true } } },
        });

        for (const plan of waitingPlans) {
            await tx.booking.updateMany({
                where: { id: plan.bookingId, status: BookingStatus.PENDING_MINIMUM },
                data: { status: BookingStatus.CONFIRMED },
            });
            await tx.bookingPaymentPlan.update({
                where: { id: plan.id },
                data: {
                    status: BookingPaymentPlanStatus.BALANCE_DUE,
                    // The balance must be settled before the trip starts.
                    balanceDueAt: session.startDate,
                    groupConfirmedAt: now,
                },
            });
        }
    }

    private async failGroupInTransaction(
        tx: Tx,
        session: { id: string },
    ) {
        const claimed = await tx.tripSession.updateMany({
            where: { id: session.id, groupStatus: SessionGroupStatus.PENDING_MINIMUM },
            data: { groupStatus: SessionGroupStatus.NOT_CONFIRMED },
        });
        if (claimed.count !== 1) return;

        const plans = await tx.bookingPaymentPlan.findMany({
            where: {
                sessionId: session.id,
                status: {
                    in: [
                        BookingPaymentPlanStatus.DEPOSIT_PAID,
                        BookingPaymentPlanStatus.DEPOSIT_DUE,
                    ],
                },
            },
            include: {
                booking: {
                    select: { id: true, guestsCount: true, status: true, travelerId: true },
                },
            },
        });

        let seatsToRestore = 0;
        for (const plan of plans) {
            if (plan.status === BookingPaymentPlanStatus.DEPOSIT_PAID) {
                await this.markBookingRefundDueInTransaction(tx, {
                    bookingId: plan.bookingId,
                    sessionId: session.id,
                    travelerId: plan.booking.travelerId,
                    guestsCount: plan.booking.guestsCount,
                    planId: plan.id,
                    plan,
                    source: PaymentLedgerSource.MANUAL_PROOF_REVIEW,
                    restoreSeats: false,
                });
                seatsToRestore += plan.booking.guestsCount;
            } else if (
                plan.status === BookingPaymentPlanStatus.DEPOSIT_DUE
                && plan.booking.status === BookingStatus.PENDING
            ) {
                // Never paid: cancel the booking; no refund is owed.
                const cancelled = await tx.booking.updateMany({
                    where: { id: plan.bookingId, status: BookingStatus.PENDING },
                    data: {
                        status: BookingStatus.CANCELLED,
                        cancelledAt: new Date(),
                        cancelledBy: 'SYSTEM',
                        cancellationReason: GROUP_MINIMUM_NOT_REACHED_REASON,
                    },
                });
                if (cancelled.count === 1) {
                    await tx.bookingPaymentPlan.update({
                        where: { id: plan.id },
                        data: { status: BookingPaymentPlanStatus.CANCELLED },
                    });
                    seatsToRestore += plan.booking.guestsCount;
                }
            }
            // Bookings whose proof is still under review (AWAITING_VALIDATION)
            // or was rejected keep their state: a later approval lands in the
            // NOT_CONFIRMED branch of applyBankConfirmationInTransaction.
        }

        if (seatsToRestore > 0) {
            await tx.tripSession.update({
                where: { id: session.id },
                data: { availableSeats: { increment: seatsToRestore } },
            });
        }
    }

    private async markBookingRefundDueInTransaction(
        tx: Tx,
        args: {
            bookingId: string;
            sessionId: string;
            travelerId: string;
            guestsCount: number;
            planId: string;
            plan: PlanForDecision;
            source: PaymentLedgerSource;
            restoreSeats?: boolean;
        },
    ) {
        await tx.booking.updateMany({
            where: { id: args.bookingId, status: BookingStatus.PENDING_MINIMUM },
            data: {
                status: BookingStatus.NOT_CONFIRMED,
                cancellationReason: GROUP_MINIMUM_NOT_REACHED_REASON,
            },
        });
        await tx.bookingPaymentPlan.update({
            where: { id: args.planId },
            data: { status: BookingPaymentPlanStatus.REFUND_DUE },
        });
        const depositPayment = await this.externalPaymentsService.recordRefundDueInTransaction(tx, {
            bookingId: args.bookingId,
            agencyId: args.plan.agencyId,
            travelerId: args.travelerId,
            amount: args.plan.depositAmount,
            currency: args.plan.currency,
            method: PaymentMethod.MANUAL,
            custodian: PaymentCustodian.AGENCY,
            source: args.source,
            stage: ExternalPaymentStage.DEPOSIT,
        });
        if (depositPayment) {
            // #370: the refund obligation becomes a first-class RefundCase
            // in the same transaction, so it can never be lost between the
            // REFUND_DUE ledger entry and the refund workflow.
            await this.refundsService.createRefundDueCaseInTransaction(tx, {
                bookingId: args.bookingId,
                agencyId: args.plan.agencyId,
                travelerId: args.travelerId,
                payment: {
                    id: depositPayment.id,
                    amount: depositPayment.amount,
                    currency: depositPayment.currency,
                    externalReference: depositPayment.externalReference,
                },
            });
        }
        if (args.restoreSeats) {
            await tx.tripSession.update({
                where: { id: args.sessionId },
                data: { availableSeats: { increment: args.guestsCount } },
            });
        }
    }

    private async claimBookingUpdate(
        tx: Tx,
        bookingId: string,
        data: {
            status: BookingStatus;
            paymentStatus: BookingPaymentStatus;
            confirmedAt?: Date | null;
        },
    ) {
        const claimed = await tx.booking.updateMany({
            where: { id: bookingId, status: BookingStatus.AWAITING_VALIDATION },
            data,
        });
        if (claimed.count !== 1) {
            throw new BadRequestException('Booking is not awaiting payment validation');
        }
    }

    private async bookingGuests(tx: Tx, bookingId: string): Promise<number> {
        const booking = await tx.booking.findUniqueOrThrow({
            where: { id: bookingId },
            select: { guestsCount: true },
        });
        return booking.guestsCount;
    }
}
