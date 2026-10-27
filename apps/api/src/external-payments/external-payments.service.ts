import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MoneyInput, toMoneyDecimal, toMoneyString } from '../common/money.util';
import {
    ExternalPaymentStage,
    ExternalPaymentStatus,
    PaymentCustodian,
    PaymentLedgerEntryType,
    PaymentLedgerSource,
    PaymentMethod,
    Prisma,
} from '@ouiboo/database';
import { randomUUID } from 'node:crypto';

/**
 * #368 — Phase 1 payment-status model.
 *
 * Traveller money is paid directly to the agency or to the agency's payment
 * provider. OuiBoo never holds it, so this service records FACTS about
 * external payments (an ExternalPayment plus an append-only
 * PaymentStatusLedgerEntry) instead of crediting a withdrawable balance.
 * There is deliberately no method here that creates, increments, or pays out
 * a balance.
 */

const PHASE_1_CUSTODIANS: ReadonlySet<string> = new Set<string>([
    PaymentCustodian.AGENCY,
    PaymentCustodian.AGENCY_PSP,
]);

/**
 * Hard invariant (plan §53): during Phase 1 the custodian of traveller funds
 * is the agency or its payment provider — never OuiBoo.
 */
export function assertPhase1Custodian(custodian: string): asserts custodian is PaymentCustodian {
    if (!PHASE_1_CUSTODIANS.has(custodian)) {
        throw new BadRequestException(
            `Payment custodian "${custodian}" is not permitted in Phase 1: traveller funds are held by the agency or its payment provider, never by OuiBoo`,
        );
    }
}

export interface RecordExternalPaymentInput {
    bookingId: string;
    agencyId: string;
    travelerId: string;
    amount: MoneyInput;
    currency?: string;
    method: PaymentMethod;
    provider?: string | null;
    externalReference?: string | null;
    externalTransactionId?: string | null;
    custodian: PaymentCustodian;
    source: PaymentLedgerSource;
    correlationId?: string | null;
    /**
     * #422 (Council P0-20): bank-confirmation facts for MANUAL payments.
     * When a bank reference is supplied, recordPaymentVerifiedInTransaction
     * stamps confirmedAmount (= the recorded amount, i.e. the bank credit
     * the agency observed), bankReference, bankConfirmedAt and
     * bankConfirmedBy on the payment — VERIFIED is bound to the bank
     * credit, never to the uploaded proof image. PSP/webhook callers do
     * not supply these fields and leave them untouched.
     */
    bankReference?: string | null;
    bankConfirmedBy?: string | null;
    /**
     * #412 (Council Session #2, B15): the refund case this refund
     * belongs to, when one exists. It discriminates the REFUND_COMPLETED
     * ledger idempotency key: a staged booking is refunded by one case
     * per stage payment (deposit case, then balance case), and each
     * case must append its own ledger entry — keyed only on the payment
     * reference, the second case's entry could be deduplicated away and
     * the booking's refunded total would undercount. PSP/webhook
     * callers pass no case id and keep the historical key format.
     */
    refundCaseId?: string | null;
    /**
     * #369: which payment stage this record belongs to. FULL (default)
     * preserves the single-payment behaviour; staged bookings record one
     * DEPOSIT and one BALANCE payment per booking.
     */
    stage?: ExternalPaymentStage;
}

/**
 * Ledger idempotency keys. The FULL-stage keys keep their historical
 * format (`booking:{id}:payment-verified`) so events recorded before
 * #369 stay deduplicated; staged payments get stage-scoped keys.
 */
function ledgerIdempotencyKey(
    bookingId: string,
    stage: ExternalPaymentStage,
    entryType: PaymentLedgerEntryType,
): string {
    const suffix = entryType.toLowerCase().replace(/_/g, '-');
    if (stage === ExternalPaymentStage.FULL) {
        return `booking:${bookingId}:${suffix}`;
    }
    return `booking:${bookingId}:${stage.toLowerCase()}:${suffix}`;
}

@Injectable()
export class ExternalPaymentsService {
    constructor(private db: DatabaseService) { }

    /**
     * Record that a traveller payment was verified/captured with the agency
     * (or its PSP) as custodian. Sets the booking's ExternalPayment to
     * VERIFIED and appends a ledger entry. Idempotent per booking.
     */
    async recordPaymentVerifiedInTransaction(
        tx: Prisma.TransactionClient,
        input: RecordExternalPaymentInput,
        entryType: PaymentLedgerEntryType = PaymentLedgerEntryType.PAYMENT_VERIFIED,
    ) {
        assertPhase1Custodian(input.custodian);
        const amount = toMoneyDecimal(input.amount);
        const payment = await this.upsertExternalPayment(tx, input, {
            status: ExternalPaymentStatus.VERIFIED,
            verifiedAt: new Date(),
            ...(input.bankReference != null
                ? {
                    bankConfirmation: {
                        confirmedAmount: amount,
                        bankReference: input.bankReference,
                        bankConfirmedAt: new Date(),
                        bankConfirmedBy: input.bankConfirmedBy ?? null,
                    },
                }
                : {}),
        });
        await this.appendLedgerEntry(tx, payment.id, input, {
            type: entryType,
            amount,
            status: ExternalPaymentStatus.VERIFIED,
            idempotencyKey: ledgerIdempotencyKey(
                input.bookingId,
                input.stage ?? ExternalPaymentStage.FULL,
                entryType,
            ),
        });
        return payment;
    }

    /**
     * #422 (Council P0-20): record that a traveller uploaded a payment
     * proof for a stage. The stage's ExternalPayment exists from upload in
     * PENDING_VERIFICATION with the EXPECTED stage amount, so every surface
     * can render "proof received — pending bank confirmation" from a real
     * record. This is not settlement: no ledger entry is appended and the
     * amount is only ever bound to a bank credit at bank confirmation.
     * Any earlier bank-confirmation facts for the stage are cleared because
     * a fresh proof supersedes them.
     */
    async recordPaymentPendingInTransaction(
        tx: Prisma.TransactionClient,
        input: RecordExternalPaymentInput,
    ) {
        assertPhase1Custodian(input.custodian);
        return this.upsertExternalPayment(tx, input, {
            status: ExternalPaymentStatus.PENDING_VERIFICATION,
            verifiedAt: null,
            clearBankConfirmation: true,
        });
    }

    /**
     * Record that a traveller payment proof was rejected. The booking's
     * ExternalPayment moves to REJECTED; no money is owed or held by OuiBoo.
     */
    async recordPaymentRejectedInTransaction(
        tx: Prisma.TransactionClient,
        input: RecordExternalPaymentInput,
    ) {
        assertPhase1Custodian(input.custodian);
        const amount = toMoneyDecimal(input.amount);
        const payment = await this.upsertExternalPayment(tx, input, {
            status: ExternalPaymentStatus.REJECTED,
            verifiedAt: null,
        });
        await this.appendLedgerEntry(tx, payment.id, input, {
            type: PaymentLedgerEntryType.PAYMENT_REJECTED,
            amount,
            status: ExternalPaymentStatus.REJECTED,
            idempotencyKey: ledgerIdempotencyKey(
                input.bookingId,
                input.stage ?? ExternalPaymentStage.FULL,
                PaymentLedgerEntryType.PAYMENT_REJECTED,
            ),
        });
        return payment;
    }

    /**
     * #373: record that a provider-reported payment FAILED. The booking is
     * deliberately NOT touched here: a failure event can never mark a
     * booking paid (plan §53/§63) — it only moves the payment record to
     * FAILED and appends a PAYMENT_FAILED ledger entry.
     */
    async recordPaymentFailedInTransaction(
        tx: Prisma.TransactionClient,
        input: RecordExternalPaymentInput,
    ) {
        assertPhase1Custodian(input.custodian);
        const amount = toMoneyDecimal(input.amount);
        const payment = await this.upsertExternalPayment(tx, input, {
            status: ExternalPaymentStatus.FAILED,
            verifiedAt: null,
        });
        await this.appendLedgerEntry(tx, payment.id, input, {
            type: PaymentLedgerEntryType.PAYMENT_FAILED,
            amount,
            status: ExternalPaymentStatus.FAILED,
            idempotencyKey: ledgerIdempotencyKey(
                input.bookingId,
                input.stage ?? ExternalPaymentStage.FULL,
                PaymentLedgerEntryType.PAYMENT_FAILED,
            ),
        });
        return payment;
    }

    /**
     * #369: record that a staged booking's deposit became refund-due
     * (the session's minimum group size was not reached by the deadline).
     * The money stays with the agency — OuiBoo only records the obligation;
     * the refund workflow itself is #370. Appends a REFUND_DUE entry
     * against the booking's DEPOSIT payment; a no-op when the booking has
     * no verified deposit.
     */
    async recordRefundDueInTransaction(
        tx: Prisma.TransactionClient,
        input: RecordExternalPaymentInput,
    ) {
        assertPhase1Custodian(input.custodian);
        const deposit = await tx.externalPayment.findFirst({
            where: {
                bookingId: input.bookingId,
                stage: ExternalPaymentStage.DEPOSIT,
            },
        });
        if (!deposit) {
            return null;
        }
        const amount = toMoneyDecimal(deposit.amount);
        await this.appendLedgerEntry(tx, deposit.id, {
            ...input,
            amount,
            currency: deposit.currency,
            stage: ExternalPaymentStage.DEPOSIT,
        }, {
            type: PaymentLedgerEntryType.REFUND_DUE,
            amount,
            status: ExternalPaymentStatus.VERIFIED,
            idempotencyKey: ledgerIdempotencyKey(
                input.bookingId,
                ExternalPaymentStage.DEPOSIT,
                PaymentLedgerEntryType.REFUND_DUE,
            ),
        });
        return deposit;
    }

    /**
     * Record a completed refund executed by the agency's payment provider.
     * The refund returns to the traveller from the provider/agency — OuiBoo
     * only records the fact and never debits a balance it does not hold.
     */
    async recordRefundInTransaction(
        tx: Prisma.TransactionClient,
        input: RecordExternalPaymentInput,
    ) {
        assertPhase1Custodian(input.custodian);
        const amount = toMoneyDecimal(input.amount);
        const payment = await this.upsertExternalPayment(tx, input, {
            status: ExternalPaymentStatus.REFUNDED,
        });
        await this.appendLedgerEntry(tx, payment.id, input, {
            type: PaymentLedgerEntryType.REFUND_COMPLETED,
            amount,
            status: ExternalPaymentStatus.REFUNDED,
            idempotencyKey: `booking:${input.bookingId}:refund-completed:${input.refundCaseId ?? input.externalTransactionId ?? input.externalReference ?? 'manual'}`,
        });
        return payment;
    }

    /**
     * #412 (Council Session #2, B15): a booking's money position derived
     * from the append-only ledger — never from per-stage ExternalPayment
     * row counts. verifiedTotal is everything captured for the booking
     * (single FULL payment, or staged DEPOSIT + BALANCE captures);
     * refundedTotal is everything recorded back to the traveller across
     * ALL refund cases. Refund completion effects read these totals, so
     * a second case accumulates instead of overwriting the first, and a
     * booking reads fully refunded exactly when the refunded total
     * covers everything that was verified.
     */
    async getBookingLedgerTotals(
        tx: Prisma.TransactionClient,
        bookingId: string,
    ): Promise<{ verifiedTotal: Prisma.Decimal; refundedTotal: Prisma.Decimal }> {
        const [verified, refunded] = await Promise.all([
            tx.paymentStatusLedgerEntry.aggregate({
                where: {
                    bookingId,
                    type: {
                        in: [
                            PaymentLedgerEntryType.PAYMENT_VERIFIED,
                            PaymentLedgerEntryType.PAYMENT_CAPTURED,
                            PaymentLedgerEntryType.DEPOSIT_CAPTURED,
                            PaymentLedgerEntryType.BALANCE_CAPTURED,
                        ],
                    },
                },
                _sum: { amount: true },
            }),
            tx.paymentStatusLedgerEntry.aggregate({
                where: { bookingId, type: PaymentLedgerEntryType.REFUND_COMPLETED },
                _sum: { amount: true },
            }),
        ]);
        return {
            verifiedTotal: toMoneyDecimal(verified._sum.amount ?? 0),
            refundedTotal: toMoneyDecimal(refunded._sum.amount ?? 0),
        };
    }

    async recordRefund(input: RecordExternalPaymentInput) {
        return this.db.$transaction((tx) => this.recordRefundInTransaction(tx, input));
    }

    /**
     * Agency payments overview: totals derived from the append-only ledger
     * (money received by the agency's own merchant account / PSP), plus the
     * payments still awaiting verification. No balance is stored or implied.
     */
    async getAgencyPaymentsOverview(agencyId: string) {
        const [received, refunded, pendingPayments, latestPayment] = await Promise.all([
            this.db.paymentStatusLedgerEntry.aggregate({
                where: {
                    agencyId,
                    type: {
                        in: [
                            PaymentLedgerEntryType.PAYMENT_VERIFIED,
                            PaymentLedgerEntryType.PAYMENT_CAPTURED,
                            // #369: staged deposit/balance captures are also
                            // money received by the agency's merchant account.
                            PaymentLedgerEntryType.DEPOSIT_CAPTURED,
                            PaymentLedgerEntryType.BALANCE_CAPTURED,
                        ],
                    },
                },
                _sum: { amount: true },
            }),
            this.db.paymentStatusLedgerEntry.aggregate({
                where: { agencyId, type: PaymentLedgerEntryType.REFUND_COMPLETED },
                _sum: { amount: true },
            }),
            this.db.externalPayment.findMany({
                where: { agencyId, status: ExternalPaymentStatus.PENDING_VERIFICATION },
                select: { amount: true },
            }),
            this.db.externalPayment.findFirst({
                where: { agencyId },
                orderBy: { createdAt: 'desc' },
                select: { currency: true },
            }),
        ]);

        const pendingAmount = pendingPayments.reduce(
            (total, payment) => total.add(toMoneyDecimal(payment.amount)),
            toMoneyDecimal(0),
        );

        return {
            currency: latestPayment?.currency || 'MAD',
            totalReceived: toMoneyString(received._sum.amount) || '0.00',
            totalRefunded: toMoneyString(refunded._sum.amount) || '0.00',
            pendingVerificationCount: pendingPayments.length,
            pendingVerificationAmount: toMoneyString(pendingAmount) || '0.00',
        };
    }

    async listAgencyPayments(agencyId: string, page = 1, limit = 20) {
        const safeLimit = Math.min(100, Math.max(1, Math.floor(limit) || 20));
        const safePage = Math.max(1, Math.floor(page) || 1);
        const where = { agencyId };
        const [payments, total] = await Promise.all([
            this.db.externalPayment.findMany({
                where,
                include: {
                    booking: {
                        select: {
                            id: true,
                            guestsCount: true,
                            traveler: { select: { name: true, email: true } },
                            session: {
                                select: {
                                    startDate: true,
                                    template: { select: { title: true } },
                                },
                            },
                        },
                    },
                },
                orderBy: { updatedAt: 'desc' },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            this.db.externalPayment.count({ where }),
        ]);

        return {
            data: payments.map((payment) => ({
                ...payment,
                amount: toMoneyString(payment.amount) || '0.00',
            })),
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit),
            },
        };
    }

    private async upsertExternalPayment(
        tx: Prisma.TransactionClient,
        input: RecordExternalPaymentInput,
        outcome: {
            status: ExternalPaymentStatus;
            verifiedAt?: Date | null;
            bankConfirmation?: {
                confirmedAmount: Prisma.Decimal;
                bankReference: string;
                bankConfirmedAt: Date;
                bankConfirmedBy: string | null;
            };
            clearBankConfirmation?: boolean;
        },
    ) {
        const amount = toMoneyDecimal(input.amount);
        const stage = input.stage ?? ExternalPaymentStage.FULL;
        // #422: bank-confirmation facts are written only by an explicit bank
        // confirmation (or cleared by a fresh proof upload); other outcome
        // transitions leave them untouched.
        const bankFields = outcome.bankConfirmation
            ? { ...outcome.bankConfirmation }
            : outcome.clearBankConfirmation
                ? {
                    confirmedAmount: null,
                    bankReference: null,
                    bankConfirmedAt: null,
                    bankConfirmedBy: null,
                }
                : {};
        return tx.externalPayment.upsert({
            where: { bookingId_stage: { bookingId: input.bookingId, stage } },
            create: {
                bookingId: input.bookingId,
                agencyId: input.agencyId,
                travelerId: input.travelerId,
                amount,
                currency: input.currency || 'MAD',
                method: input.method,
                provider: input.provider ?? null,
                externalReference: input.externalReference ?? null,
                custodian: input.custodian,
                status: outcome.status,
                verifiedAt: outcome.verifiedAt ?? null,
                stage,
                ...bankFields,
            },
            update: {
                amount,
                currency: input.currency || 'MAD',
                method: input.method,
                provider: input.provider ?? null,
                externalReference: input.externalReference ?? null,
                custodian: input.custodian,
                status: outcome.status,
                stage,
                ...(outcome.verifiedAt !== undefined ? { verifiedAt: outcome.verifiedAt } : {}),
                ...bankFields,
            },
        });
    }

    private async appendLedgerEntry(
        tx: Prisma.TransactionClient,
        externalPaymentId: string,
        input: RecordExternalPaymentInput,
        entry: {
            type: PaymentLedgerEntryType;
            amount: Prisma.Decimal;
            status: ExternalPaymentStatus;
            idempotencyKey: string;
        },
    ) {
        // Same idempotent-insert pattern the wallet ledger used: a duplicate
        // event for the same booking transition inserts nothing.
        await tx.$executeRaw`
            INSERT INTO "PaymentStatusLedgerEntry"
                ("id", "externalPaymentId", "bookingId", "agencyId", "travelerId", "type", "amount", "currency", "custodian", "provider", "externalTransactionId", "status", "source", "idempotencyKey", "correlationId", "occurredAt", "createdAt")
            VALUES
                (${randomUUID()}, ${externalPaymentId}, ${input.bookingId}, ${input.agencyId}, ${input.travelerId}, ${entry.type}::"PaymentLedgerEntryType", ${entry.amount}, ${input.currency || 'MAD'}, ${input.custodian}::"PaymentCustodian", ${input.provider ?? null}, ${input.externalTransactionId ?? null}, ${entry.status}::"ExternalPaymentStatus", ${input.source}::"PaymentLedgerSource", ${entry.idempotencyKey}, ${input.correlationId ?? null}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT ("idempotencyKey") DO NOTHING
        `;
    }
}
