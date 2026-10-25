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
    RefundEvidenceSource,
    RefundEvidenceTier,
    RefundStatus,
} from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';
import { toMoneyDecimal, toMoneyString } from '../common/money.util';
import { PRIVATE_FILE_PREFIX } from '../upload/upload.constants';
import { GROUP_MINIMUM_NOT_REACHED_REASON } from '../staged-payments/staged-payments.util';
import {
    REFUND_ACTIVE_STATUSES,
    REFUND_AGENCY_ACTION_STATUSES,
    REFUND_AUDIT_AMOUNT_THRESHOLD_MAD,
    REFUND_DISPUTE_WINDOW_DAYS,
    REFUND_OVERDUE_ELIGIBLE_STATUSES,
    REFUND_POLICY_VERSION,
    REFUND_REASON_ADMIN_INITIATED,
    REFUND_REASON_AGENCY_CANCELLATION,
    REFUND_REASON_TRAVELLER_REQUEST,
    REFUND_RESTRICTION_REASON,
    REFUND_RULE_MINIMUM_NOT_REACHED,
    REFUND_SYSTEM_ACTOR,
    canTransitionRefund,
    qualifyingRefundCompletion,
    refundAuditRequired,
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
 *
 * #416 (Council P0-09): completion is evidence-gated. A case completes
 * only on a qualifying RefundEvidence set (see qualifyingRefundCompletion
 * in refunds.util) — the agency can no longer certify its own refund, so
 * the overdue restriction can now only lift on an evidence-backed
 * completion.
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
    // #416C: the evidence trail travels with the case so every surface
    // (agency form, admin audit queue, traveller view) can show WHAT a
    // completion rests on. Append-only rows, oldest first.
    evidence: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.RefundCaseInclude;

export function serializeRefundCase<T extends Record<string, any>>(refundCase: T) {
    return {
        ...refundCase,
        requestedAmount: toMoneyString(refundCase.requestedAmount),
        approvedAmount:
            refundCase.approvedAmount === null || refundCase.approvedAmount === undefined
                ? null
                : toMoneyString(refundCase.approvedAmount),
        ...(Array.isArray(refundCase.evidence)
            ? {
                evidence: refundCase.evidence.map((row: Record<string, any>) => ({
                    ...row,
                    amount:
                        row.amount === null || row.amount === undefined
                            ? null
                            : toMoneyString(row.amount),
                })),
            }
            : {}),
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
        // #416B: REFUND_COMPLETED → ELIGIBILITY_REVIEW exists in the
        // transition map for the traveller dispute path ONLY. Review by
        // an agency/admin must never reopen a completed case — that is
        // the traveller's dispute (or the #423 admin repair).
        if (refundCase.status === RefundCaseStatus.REFUND_COMPLETED) {
            throw new BadRequestException(
                'A completed refund case cannot return to review: it reopens only through the traveller dispute path or an admin repair',
            );
        }
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

    /**
     * #416 (Council P0-09): attach completion evidence to an open case —
     * the agency's tier 2/3 submission (one shape, decision D9). The bank
     * reference and the retained confirmation document are BOTH
     * mandatory: a reference without retained proof is an assertion, not
     * evidence. The proof must be a private upload owned by the agency
     * (private/{userId}/…, the #415 identity-document pattern) — another
     * user's key is rejected. The row records tier BANK_REFERENCE,
     * upgraded to BANK_PROVIDER_CONFIRMATION when the reference matches
     * a provider transaction id the system already holds for the booking
     * (a PaymentAttempt.providerPaymentId from the PSP flow) — the
     * reference is verified against system records, not merely asserted.
     * Evidence is append-only: rows are never updated or deleted here.
     */
    async addEvidence(
        actor: RefundActor,
        role: RefundActorRole,
        tenantAgencyId: string | null,
        caseId: string,
        input: { reference?: string; proofUrl?: string; amount?: string | number; note?: string },
    ) {
        if (role !== 'AGENCY') {
            throw new ForbiddenException('Only the agency can submit refund evidence');
        }
        const refundCase = await this.loadCaseForActor(caseId, role, tenantAgencyId);
        if (!REFUND_ACTIVE_STATUSES.includes(refundCase.status)) {
            throw new BadRequestException(
                'Evidence can only be attached to an open refund case',
            );
        }
        const reference = input.reference?.trim();
        if (!reference) {
            throw new BadRequestException(
                'A bank reference is required to submit refund evidence',
            );
        }
        const proofUrl = input.proofUrl?.trim();
        if (!proofUrl) {
            throw new BadRequestException(
                'A retained confirmation document is required to submit refund evidence',
            );
        }
        const ownPrefix = `${PRIVATE_FILE_PREFIX}/${actor.id}/`;
        if (!proofUrl.startsWith(ownPrefix)) {
            throw new BadRequestException(
                'proofUrl must reference a private document uploaded by this agency',
            );
        }
        const providerAttempt = await this.db.paymentAttempt.findFirst({
            where: { bookingId: refundCase.bookingId, providerPaymentId: reference },
            select: { id: true },
        });
        const tier = providerAttempt
            ? RefundEvidenceTier.BANK_PROVIDER_CONFIRMATION
            : RefundEvidenceTier.BANK_REFERENCE;
        const evidence = await this.db.$transaction(async (tx) => {
            const created = await tx.refundEvidence.create({
                data: {
                    refundCaseId: refundCase.id,
                    tier,
                    source: RefundEvidenceSource.AGENCY,
                    reference,
                    proofUrl,
                    amount:
                        input.amount !== undefined
                            ? toMoneyDecimal(input.amount, 'amount')
                            : undefined,
                    note: input.note?.trim() ? input.note.trim().slice(0, 1000) : undefined,
                    recordedBy: actor.id,
                },
            });
            await this.audit(tx, actor, 'REFUND_EVIDENCE_RECORDED', refundCase.id, {
                evidenceId: created.id,
                tier,
                source: RefundEvidenceSource.AGENCY,
            });
            return created;
        });
        return {
            ...evidence,
            amount:
                evidence.amount === null || evidence.amount === undefined
                    ? null
                    : toMoneyString(evidence.amount),
        };
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
            // #416 (Council P0-09): the completion gate. Checked inside
            // the transaction against the case's evidence rows, before
            // any state moves. An agency can never certify its own
            // refund: with no qualifying evidence the completion is
            // refused and nothing is written. An admin completing a case
            // records their review as tier-5 evidence in the same
            // transaction — that recorded review IS the qualifying tier
            // (and the only way tier 4 traveller confirmation, which
            // never qualifies alone, can corroborate a completion).
            if (!canTransitionRefund(refundCase.status, RefundCaseStatus.REFUND_COMPLETED)) {
                throw new BadRequestException(
                    `Refund case cannot move from ${refundCase.status} to ${RefundCaseStatus.REFUND_COMPLETED}`,
                );
            }
            const evidenceRows = await tx.refundEvidence.findMany({
                where: { refundCaseId: refundCase.id },
            });
            let qualifying = qualifyingRefundCompletion(evidenceRows);
            if (!qualifying && role === 'ADMIN') {
                await tx.refundEvidence.create({
                    data: {
                        refundCaseId: refundCase.id,
                        tier: RefundEvidenceTier.ADMIN_REVIEW,
                        source: RefundEvidenceSource.ADMIN,
                        recordedBy: actor.id,
                    },
                });
                await this.audit(tx, actor, 'REFUND_EVIDENCE_RECORDED', refundCase.id, {
                    tier: RefundEvidenceTier.ADMIN_REVIEW,
                    source: RefundEvidenceSource.ADMIN,
                    via: 'ADMIN_COMPLETION',
                });
                qualifying = {
                    tier: RefundEvidenceTier.ADMIN_REVIEW,
                    source: PaymentLedgerSource.ADMIN_PROOF_REVIEW,
                    reference: null,
                };
            }
            if (!qualifying) {
                throw new BadRequestException(
                    'A refund case can only be completed with evidence: a PSP or bank/provider confirmation, a bank reference with a retained proof document, or an admin review (the traveller\u2019s confirmation alone is not sufficient). Attach evidence before completing.',
                );
            }
            // #416B: stamp the risk-based audit flag at completion time
            // (plan §2.5) — hard signals or the deterministic sample.
            const auditRequired = await this.computeAuditRequiredInTransaction(
                tx,
                refundCase,
                qualifying.tier,
                evidenceRows,
            );
            const updated = await this.transitionInTransaction(
                tx,
                refundCase,
                RefundCaseStatus.REFUND_COMPLETED,
                actor,
                {
                    initiatedAt: refundCase.initiatedAt ?? new Date(),
                    completedAt: new Date(),
                    completionTier: qualifying.tier,
                    auditRequired,
                    providerRefundId:
                        input.providerRefundId?.trim() || refundCase.providerRefundId,
                    // #416: provider status is recorded as reported only —
                    // the old `?? 'COMPLETED'` default manufactured a
                    // provider fact out of an empty request.
                    ...(input.providerStatus?.trim()
                        ? { providerStatus: input.providerStatus.trim() }
                        : {}),
                },
            );

            // Record the refund as an external payment fact: the agency /
            // its provider returned the money to the traveller. OuiBoo
            // only records it (ledger REFUND_COMPLETED). #416: the
            // ledger source derives from the qualifying evidence tier —
            // a typed providerRefundId no longer manufactures
            // GATEWAY_REFUND provenance.
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
                        qualifying.reference
                        || input.providerRefundId?.trim()
                        || refundCase.providerRefundId
                        || null,
                    custodian: payment.custodian,
                    source: qualifying.source,
                    stage: payment.stage,
                });
            }

            await this.applyCompletionBookingEffectsInTransaction(tx, refundCase, amount);
            return updated;
        });
        await this.refreshAgencyRestriction(completed.agencyId);
        return serializeRefundCase(completed);
    }

    /**
     * The booking/plan side effects of a completion, shared by the
     * gated complete() path and the PSP-confirmation path (#416B):
     * legacy booking refund fields stay consistent for existing UI, and
     * the staged plan's refund obligation closes (REFUND_DUE →
     * REFUNDED). The ledger write itself is NOT here: complete()
     * records it from the qualifying evidence, the PSP paths record it
     * from the provider event — each completion writes it exactly once.
     */
    private async applyCompletionBookingEffectsInTransaction(
        tx: Tx,
        refundCase: { bookingId: string },
        amount: Prisma.Decimal,
    ) {
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
    }

    /**
     * #416B (Council P0-09, plan §2.5): evaluate the risk-based audit
     * signals for a completion in flight. "Ever overdue" is read from
     * the case's own transition audit trail (every transition is
     * audited); the rest comes from the case row and its evidence.
     */
    private async computeAuditRequiredInTransaction(
        tx: Tx,
        refundCase: {
            id: string;
            status: RefundCaseStatus;
            disputedAt?: Date | null;
            approvedAmount?: Prisma.Decimal | null;
            requestedAmount: Prisma.Decimal;
        },
        completionTier: RefundEvidenceTier,
        evidenceRows: Array<{
            tier: RefundEvidenceTier;
            source?: RefundEvidenceSource | string | null;
            reference?: string | null;
            proofUrl?: string | null;
        }>,
    ): Promise<boolean> {
        const amount = toMoneyDecimal(
            refundCase.approvedAmount ?? refundCase.requestedAmount,
        );
        let wasEverOverdue = refundCase.status === RefundCaseStatus.REFUND_OVERDUE;
        if (!wasEverOverdue) {
            const transitions = await tx.auditLog.findMany({
                where: {
                    targetType: 'REFUND_CASE',
                    targetId: refundCase.id,
                    action: 'REFUND_CASE_TRANSITION',
                },
                select: { metadata: true },
            });
            wasEverOverdue = transitions.some(
                (row) =>
                    (row.metadata as { to?: string } | null)?.to
                    === RefundCaseStatus.REFUND_OVERDUE,
            );
        }
        return refundAuditRequired({
            wasEverOverdue,
            wasDisputed: !!refundCase.disputedAt,
            amountAtOrAboveThreshold: amount.greaterThanOrEqualTo(
                REFUND_AUDIT_AMOUNT_THRESHOLD_MAD,
            ),
            completionTier,
            travellerConfirmationPresent: evidenceRows.some(
                (e) => e.tier === RefundEvidenceTier.TRAVELLER_CONFIRMATION,
            ),
            caseId: refundCase.id,
        });
    }

    /**
     * #416B (Council P0-09, plan §2.3): wire a provider-confirmed refund
     * (PSP webhook `refunded` event, or an executed
     * PaymentRequestsService.requestRefundForAttempt) into the booking's
     * RefundCase as tier-1 evidence. Called INSIDE the caller's
     * transaction, AFTER the caller has recorded the refund in the
     * ledger — this method never writes a ledger entry, so the refund
     * is recorded exactly once (by the PSP path, source GATEWAY_REFUND).
     *
     * Behaviour:
     * - No active case for the booking → nothing happens; the PSP
     *   refund stands on its own, exactly as before #416.
     * - Otherwise a PSP_CONFIRMATION evidence row is appended (source
     *   SYSTEM_WEBHOOK; a repeat delivery with the same reference does
     *   not duplicate the row).
     * - A case in REFUND_INITIATED or AGENCY_ACTION_REQUIRED completes
     *   as the system actor with completionTier PSP_CONFIRMATION
     *   (an AGENCY_ACTION_REQUIRED case passes through REFUND_INITIATED
     *   first — the state machine has no direct edge, and the audit
     *   trail stays truthful). Any other state (e.g. ELIGIBILITY_REVIEW,
     *   REFUND_OVERDUE) keeps the evidence for the normal flow: the
     *   tier-1 row qualifies a later complete() call.
     */
    async recordPspRefundConfirmationInTransaction(
        tx: Tx,
        args: {
            bookingId: string;
            externalPaymentId?: string | null;
            providerRefundId?: string | null;
            providerStatus?: string | null;
        },
    ): Promise<{ matched: boolean; completed: boolean; agencyId: string | null }> {
        const candidates = await tx.refundCase.findMany({
            where: {
                bookingId: args.bookingId,
                status: { in: REFUND_ACTIVE_STATUSES },
            },
            orderBy: { createdAt: 'asc' },
        });
        if (candidates.length === 0) {
            return { matched: false, completed: false, agencyId: null };
        }
        // One active case per booking is the invariant (assertNoActiveCase),
        // but prefer the case opened against this attempt's payment when
        // several exist (e.g. a closed-then-reopened history).
        const refundCase =
            (args.externalPaymentId
                ? candidates.find((c) => c.originalPaymentId === args.externalPaymentId)
                : undefined) ?? candidates[0];

        const reference = args.providerRefundId?.trim() || null;
        const existingEvidence = await tx.refundEvidence.findMany({
            where: { refundCaseId: refundCase.id },
        });
        let evidenceRows = existingEvidence;
        const alreadyRecorded = existingEvidence.some(
            (e) =>
                e.tier === RefundEvidenceTier.PSP_CONFIRMATION
                && (e.reference ?? null) === reference,
        );
        if (!alreadyRecorded) {
            const created = await tx.refundEvidence.create({
                data: {
                    refundCaseId: refundCase.id,
                    tier: RefundEvidenceTier.PSP_CONFIRMATION,
                    source: RefundEvidenceSource.SYSTEM_WEBHOOK,
                    reference,
                    recordedBy: REFUND_SYSTEM_ACTOR,
                },
            });
            evidenceRows = [...existingEvidence, created];
            await this.audit(
                tx,
                { id: REFUND_SYSTEM_ACTOR },
                'REFUND_EVIDENCE_RECORDED',
                refundCase.id,
                {
                    evidenceId: created.id,
                    tier: RefundEvidenceTier.PSP_CONFIRMATION,
                    source: RefundEvidenceSource.SYSTEM_WEBHOOK,
                    via: 'PSP_REFUND_CONFIRMATION',
                },
            );
        }

        const completable =
            refundCase.status === RefundCaseStatus.REFUND_INITIATED
            || refundCase.status === RefundCaseStatus.AGENCY_ACTION_REQUIRED;
        if (!completable) {
            return { matched: true, completed: false, agencyId: refundCase.agencyId };
        }

        const systemActor = { id: REFUND_SYSTEM_ACTOR };
        const now = new Date();
        const providerPatch = {
            providerRefundId: reference || refundCase.providerRefundId,
            ...(args.providerStatus?.trim()
                ? { providerStatus: args.providerStatus.trim() }
                : {}),
        };
        let current: typeof refundCase = refundCase;
        if (current.status === RefundCaseStatus.AGENCY_ACTION_REQUIRED) {
            current = await this.transitionInTransaction(
                tx,
                current,
                RefundCaseStatus.REFUND_INITIATED,
                systemActor,
                { initiatedAt: current.initiatedAt ?? now, ...providerPatch },
            );
        }
        const auditRequired = await this.computeAuditRequiredInTransaction(
            tx,
            current,
            RefundEvidenceTier.PSP_CONFIRMATION,
            evidenceRows,
        );
        const amount = toMoneyDecimal(current.approvedAmount ?? current.requestedAmount);
        const updated = await this.transitionInTransaction(
            tx,
            current,
            RefundCaseStatus.REFUND_COMPLETED,
            systemActor,
            {
                initiatedAt: current.initiatedAt ?? now,
                completedAt: now,
                completionTier: RefundEvidenceTier.PSP_CONFIRMATION,
                auditRequired,
                ...providerPatch,
            },
        );
        await this.applyCompletionBookingEffectsInTransaction(tx, updated, amount);
        return { matched: true, completed: true, agencyId: updated.agencyId };
    }

    /**
     * #416B (Council P0-09, plan §2.4): the traveller confirms the
     * refund money actually arrived. Records tier-4 evidence and stamps
     * travellerConfirmedAt. Tier 4 NEVER completes a case on its own
     * (the council rule): it corroborates a later evidence-backed
     * completion (tiers 1–3, or an admin's tier-5 review). Only the
     * case's own traveller, only while the refund is REFUND_INITIATED
     * (sent by the agency, arrival pending), only once.
     */
    async confirmReceipt(travelerId: string, caseId: string) {
        const refundCase = await this.loadCaseForActor(caseId, 'TRAVELER', travelerId);
        if (refundCase.status !== RefundCaseStatus.REFUND_INITIATED) {
            throw new BadRequestException(
                'Receipt can only be confirmed while the refund has been initiated (sent) by the agency',
            );
        }
        if (refundCase.travellerConfirmedAt) {
            throw new BadRequestException(
                'You have already confirmed receipt of this refund',
            );
        }
        const updated = await this.db.$transaction(async (tx) => {
            const claimed = await tx.refundCase.updateMany({
                where: {
                    id: refundCase.id,
                    status: RefundCaseStatus.REFUND_INITIATED,
                    travellerConfirmedAt: null,
                },
                data: { travellerConfirmedAt: new Date(), updatedBy: travelerId },
            });
            if (claimed.count !== 1) {
                throw new ConflictException('Refund case was modified concurrently');
            }
            const evidence = await tx.refundEvidence.create({
                data: {
                    refundCaseId: refundCase.id,
                    tier: RefundEvidenceTier.TRAVELLER_CONFIRMATION,
                    source: RefundEvidenceSource.TRAVELLER,
                    recordedBy: travelerId,
                },
            });
            await this.audit(tx, { id: travelerId }, 'REFUND_EVIDENCE_RECORDED', refundCase.id, {
                evidenceId: evidence.id,
                tier: RefundEvidenceTier.TRAVELLER_CONFIRMATION,
                source: RefundEvidenceSource.TRAVELLER,
                via: 'TRAVELLER_CONFIRM_RECEIPT',
            });
            return tx.refundCase.findUniqueOrThrow({
                where: { id: refundCase.id },
                include: CASE_INCLUDE,
            });
        });
        return serializeRefundCase(updated);
    }

    /**
     * #416B (Council P0-09, plan §§2.4–2.5, decisions D7/D8): the
     * traveller says the money never arrived — the completed case
     * reopens. Only the case's own traveller, only from
     * REFUND_COMPLETED, only within REFUND_DISPUTE_WINDOW_DAYS of the
     * completion. The reopening clears completionTier (the recorded
     * completion no longer stands) and stamps the dispute; the ledger
     * is append-only and is NOT rewritten — the original
     * REFUND_COMPLETED entry stays as a payment fact, while the
     * booking/plan money fields revert so dashboards show the
     * obligation as live again (booking refundStatus → PENDING, plan
     * REFUNDED → REFUND_DUE). The agency's new-bookings restriction
     * does NOT re-apply here: it returns only through the normal
     * overdue path if the reopened case misses its (review-reset)
     * deadline.
     */
    async disputeReceipt(travelerId: string, caseId: string, input: { reason: string }) {
        const reason = input.reason?.trim();
        if (!reason) {
            throw new BadRequestException('A reason is required to dispute a refund');
        }
        const refundCase = await this.loadCaseForActor(caseId, 'TRAVELER', travelerId);
        if (refundCase.status !== RefundCaseStatus.REFUND_COMPLETED) {
            throw new BadRequestException('Only a completed refund can be disputed');
        }
        const completedAt = refundCase.completedAt;
        const windowMs = REFUND_DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
        if (!completedAt || Date.now() - completedAt.getTime() > windowMs) {
            throw new BadRequestException(
                `A completed refund can only be disputed within ${REFUND_DISPUTE_WINDOW_DAYS} days of completion`,
            );
        }
        const updated = await this.db.$transaction(async (tx) => {
            const reopened = await this.transitionInTransaction(
                tx,
                refundCase,
                RefundCaseStatus.ELIGIBILITY_REVIEW,
                { id: travelerId },
                {
                    disputeReason: reason.slice(0, 1000),
                    disputedAt: new Date(),
                    completionTier: null,
                },
            );
            await this.audit(tx, { id: travelerId }, 'TRAVELLER_DISPUTE', refundCase.id, {
                reason: reason.slice(0, 1000),
                from: RefundCaseStatus.REFUND_COMPLETED,
                completedAt: completedAt.toISOString(),
            });
            await tx.booking.update({
                where: { id: refundCase.bookingId },
                data: { refundStatus: RefundStatus.PENDING },
            });
            await tx.bookingPaymentPlan.updateMany({
                where: {
                    bookingId: refundCase.bookingId,
                    status: BookingPaymentPlanStatus.REFUNDED,
                },
                data: { status: BookingPaymentPlanStatus.REFUND_DUE },
            });
            return reopened;
        });
        return serializeRefundCase(updated);
    }

    /**
     * #416B (Council P0-09, plan §2.5): record that an admin has
     * reviewed a completed case flagged for the risk-based audit queue
     * (auditRequired). The audited toggle only stamps auditedAt /
     * auditedBy — auditing is a review obligation, never a completion
     * blocker. The audit-queue UI lands in 416C.
     */
    async markAudited(actor: RefundActor, caseId: string) {
        const refundCase = await this.loadCaseForActor(caseId, 'ADMIN', null);
        const updated = await this.db.$transaction(async (tx) => {
            const claimed = await tx.refundCase.updateMany({
                where: { id: refundCase.id, status: refundCase.status },
                data: { auditedAt: new Date(), auditedBy: actor.id, updatedBy: actor.id },
            });
            if (claimed.count !== 1) {
                throw new ConflictException('Refund case was modified concurrently');
            }
            await this.audit(tx, actor, 'REFUND_CASE_AUDITED', refundCase.id, {
                auditRequired: refundCase.auditRequired,
            });
            return tx.refundCase.findUniqueOrThrow({
                where: { id: refundCase.id },
                include: CASE_INCLUDE,
            });
        });
        return serializeRefundCase(updated);
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
    // #423: admin-only repairs of stuck refund cases. These deliberately
    // bypass REFUND_TRANSITIONS (terminal states have no exits there):
    // they exist so a wrongly-completed case, a wrong approved amount,
    // or a wrong payment link never again needs a direct DB edit. Each
    // repair is claimed atomically and audited in the same transaction.
    // ------------------------------------------------------------------

    async repairCaseAsAdmin(
        actor: RefundActor,
        caseId: string,
        input: {
            action: 'reopen' | 'correct-amount' | 'relink-payment';
            reason: string;
            approvedAmount?: string | number;
            originalPaymentId?: string | null;
            externalPaymentReference?: string;
        },
    ) {
        const reason = input.reason?.trim();
        if (!reason) {
            throw new BadRequestException('A reason is required for admin refund repairs');
        }
        const refundCase = await this.loadCaseForActor(caseId, 'ADMIN', null);
        const updated = await this.db.$transaction(async (tx) => {
            const before = {
                status: refundCase.status,
                approvedAmount:
                    refundCase.approvedAmount === null || refundCase.approvedAmount === undefined
                        ? null
                        : toMoneyString(refundCase.approvedAmount),
                originalPaymentId: refundCase.originalPaymentId ?? null,
                externalPaymentReference: refundCase.externalPaymentReference ?? null,
                completedAt: refundCase.completedAt ?? null,
            };
            // Unchecked input: the relink repair writes the
            // originalPaymentId foreign-key scalar, which the checked
            // update-many input does not expose.
            const patch: Prisma.RefundCaseUncheckedUpdateManyInput = {};
            let reopened = false;

            if (input.action === 'reopen') {
                if (
                    refundCase.status !== RefundCaseStatus.REFUND_COMPLETED
                    && refundCase.status !== RefundCaseStatus.REFUND_REJECTED
                ) {
                    throw new BadRequestException(
                        'Only a completed or rejected refund case can be reopened',
                    );
                }
                patch.status = RefundCaseStatus.ELIGIBILITY_REVIEW;
                patch.completedAt = null;
                reopened = true;
            } else if (input.action === 'correct-amount') {
                if (refundCase.status === RefundCaseStatus.REFUND_REJECTED) {
                    throw new BadRequestException(
                        'Reopen the rejected case before correcting its amount',
                    );
                }
                if (input.approvedAmount === undefined) {
                    throw new BadRequestException(
                        'approvedAmount is required to correct a refund amount',
                    );
                }
                const approvedAmount = toMoneyDecimal(input.approvedAmount, 'approvedAmount');
                const requested = toMoneyDecimal(refundCase.requestedAmount);
                if (approvedAmount.lessThanOrEqualTo(0) || approvedAmount.greaterThan(requested)) {
                    throw new BadRequestException(
                        'approvedAmount must be greater than 0 and no more than the requested amount',
                    );
                }
                patch.approvedAmount = approvedAmount;
                if (refundCase.status === RefundCaseStatus.REFUND_COMPLETED) {
                    // Correcting a completed case reopens it in the same
                    // intervention: the recorded completion no longer
                    // matches the corrected obligation, so the case goes
                    // back through review instead of silently rewriting
                    // history. The original completion stays in the audit
                    // trail (and its ledger entry is a payment fact, not
                    // rewritten either).
                    patch.status = RefundCaseStatus.ELIGIBILITY_REVIEW;
                    patch.completedAt = null;
                    reopened = true;
                }
            } else if (input.action === 'relink-payment') {
                if (input.originalPaymentId !== undefined) {
                    if (input.originalPaymentId === null || input.originalPaymentId.trim() === '') {
                        patch.originalPaymentId = null;
                        patch.externalPaymentReference =
                            input.externalPaymentReference?.trim() || null;
                    } else {
                        const payment = await tx.externalPayment.findUnique({
                            where: { id: input.originalPaymentId.trim() },
                        });
                        if (!payment) {
                            throw new BadRequestException('Original payment not found');
                        }
                        if (payment.bookingId !== refundCase.bookingId) {
                            throw new BadRequestException(
                                'Original payment belongs to a different booking',
                            );
                        }
                        patch.originalPaymentId = payment.id;
                        patch.externalPaymentReference =
                            input.externalPaymentReference?.trim() || payment.externalReference;
                    }
                } else if (input.externalPaymentReference !== undefined) {
                    patch.externalPaymentReference = input.externalPaymentReference.trim() || null;
                } else {
                    throw new BadRequestException(
                        'Nothing to relink: provide originalPaymentId or externalPaymentReference',
                    );
                }
            } else {
                throw new BadRequestException(`Unknown refund repair action: ${input.action}`);
            }

            const claimed = await tx.refundCase.updateMany({
                where: { id: refundCase.id, status: refundCase.status },
                data: { ...patch, updatedBy: actor.id },
            });
            if (claimed.count !== 1) {
                throw new ConflictException('Refund case was modified concurrently');
            }
            const after = await tx.refundCase.findUniqueOrThrow({
                where: { id: refundCase.id },
                include: CASE_INCLUDE,
            });
            await this.audit(tx, actor, 'ADMIN_REFUND_REPAIRED', refundCase.id, {
                repairAction: input.action,
                reason: reason.slice(0, 1000),
                reopened,
                before,
                after: {
                    status: after.status,
                    approvedAmount:
                        after.approvedAmount === null || after.approvedAmount === undefined
                            ? null
                            : toMoneyString(after.approvedAmount),
                    originalPaymentId: after.originalPaymentId ?? null,
                    externalPaymentReference: after.externalPaymentReference ?? null,
                    completedAt: after.completedAt ?? null,
                },
            });
            return after;
        });
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
        auditQueue?: string | boolean;
    }) {
        const { page, limit } = parseRefundPagination(query.page, query.limit);
        const status = this.parseStatusFilter(query.status);
        // #416C: the audit queue is completed cases flagged by the
        // risk-based audit rule (auditRequired stamped at completion in
        // 416B) that no admin has reviewed yet. It pins the status to
        // REFUND_COMPLETED — the audit flag only exists on completions.
        const auditQueue = query.auditQueue === true || query.auditQueue === 'true';
        const where: Prisma.RefundCaseWhereInput = {
            ...(status ? { status } : {}),
            ...(query.agencyId ? { agencyId: query.agencyId } : {}),
            ...(auditQueue
                ? {
                    status: RefundCaseStatus.REFUND_COMPLETED,
                    auditRequired: true,
                    auditedAt: null,
                }
                : {}),
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
        // #424: copy lives in the email locale table (en/fr/ar); the
        // agency's locale is not recorded yet, so the default applies.
        const html = this.emailService.getRefundActionRequiredTemplate(
            bookingId,
            `${appUrl}/dashboard/refunds`,
        );
        await this.emailService.sendEmail(
            email,
            this.emailService.getRefundActionRequiredSubject(),
            html,
        );
    }
}
