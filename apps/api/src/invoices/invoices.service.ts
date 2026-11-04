import {
    BadRequestException,
    Injectable,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { toMoneyDecimal, toMoneyString } from '../common/money.util';
import { getBillingConfig } from '../common/billing-config';
import {
    classifyTerminalEvent,
    computeCreditNoteLine,
    computeFeeLine,
    computeRetainedBase,
    computeSubscriptionLine,
    computeVatBreakdown,
} from './fiscal-computation';

export interface IssuerLegalDetails {
    name: string | null;
    ice: string | null;
    // #426: Identifiant Fiscal — a required mention on a Moroccan
    // fiscal invoice, missing from the schema until now.
    if: string | null;
    rc: string | null;
    address: string | null;
}

const INVOICE_NUMBER_PREFIX = 'INV';
// #426: credit notes (avoirs) number in their OWN series (AV-),
// independent of the invoice series, per Moroccan practice.
const CREDIT_NOTE_NUMBER_PREFIX = 'AV';

// Ledger entry types that prove money was verified as paid to the
// agency (mirrors ExternalPaymentsService.getBookingLedgerTotals —
// the wallet is a ledger mirror, and the ledger is the source the
// #412 refund effects already derive from).
const VERIFIED_LEDGER_TYPES = [
    'PAYMENT_VERIFIED',
    'PAYMENT_CAPTURED',
    'DEPOSIT_CAPTURED',
    'BALANCE_CAPTURED',
];

const isMissingTableError = (error: unknown) =>
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2021' || error.code === 'P2022');

const invoicesNotReady = () =>
    new ServiceUnavailableException({
        code: 'INVOICES_NOT_READY',
        message: 'Invoice storage is not available yet (database migration pending).',
    });

export const parseInvoicePagination = (page?: string, limit?: string) => {
    const parsedPage = Number(page);
    const parsedLimit = Number(limit);
    return {
        page: Number.isFinite(parsedPage) ? Math.max(Math.floor(parsedPage), 1) : 1,
        limit: Number.isFinite(parsedLimit)
            ? Math.min(Math.max(Math.floor(parsedLimit), 1), 100)
            : 20,
    };
};

export const buildInvoicePaginationMeta = (total: number, page: number, limit: number) => ({
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
});

type InvoiceWithLines = Prisma.InvoiceGetPayload<{ include: { lineItems: true } }>;

export const serializeInvoice = (invoice: InvoiceWithLines) => ({
    id: invoice.id,
    number: invoice.number,
    // #426: document class + credit-note linkage + TVA snapshot.
    documentType: invoice.documentType ?? 'INVOICE',
    creditNoteForId: invoice.creditNoteForId ?? null,
    creditReason: invoice.creditReason ?? null,
    agencyId: invoice.agencyId,
    agencyName: invoice.agencyName,
    agencyIce: invoice.agencyIce,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    currency: invoice.currency,
    commissionRate: new Prisma.Decimal(invoice.commissionRate).toFixed(2),
    subtotalAmount: toMoneyString(invoice.subtotalAmount),
    totalAmount: toMoneyString(invoice.totalAmount),
    vatRate: new Prisma.Decimal(invoice.vatRate ?? 20).toFixed(2),
    vatAmount: toMoneyString(invoice.vatAmount ?? 0),
    totalTtcAmount: toMoneyString(invoice.totalTtcAmount ?? invoice.totalAmount),
    status: invoice.status,
    issuerName: invoice.issuerName,
    issuerIce: invoice.issuerIce,
    issuerIf: invoice.issuerIf ?? null,
    issuerRc: invoice.issuerRc,
    issuerAddress: invoice.issuerAddress,
    issuedAt: invoice.issuedAt,
    lineItems: (invoice.lineItems ?? []).map((line) => ({
        id: line.id,
        bookingId: line.bookingId,
        refundCaseId: line.refundCaseId ?? null,
        lineType: line.lineType ?? 'SERVICE_FEE',
        description: line.description,
        bookingDate: line.bookingDate,
        grossAmount: toMoneyString(line.grossAmount),
        commissionRate: new Prisma.Decimal(line.commissionRate).toFixed(2),
        commissionAmount: toMoneyString(line.commissionAmount),
        amountHt: toMoneyString(line.amountHt ?? line.commissionAmount),
        vatRate: new Prisma.Decimal(line.vatRate ?? invoice.vatRate ?? 20).toFixed(2),
        vatAmount: toMoneyString(line.vatAmount ?? 0),
        amountTtc: toMoneyString(line.amountTtc ?? line.commissionAmount),
    })),
});

@Injectable()
export class InvoicesService {
    constructor(private db: DatabaseService) { }

    /**
     * Ouiboo's legal issuer details come from environment configuration
     * (OUIBOO_LEGAL_*). The company is not registered yet, so every field is
     * optional and stays null until configured — never invent an ICE/RC.
     */
    getIssuerLegalDetails(): IssuerLegalDetails {
        const read = (key: string) => {
            const value = process.env[key]?.trim();
            return value ? value : null;
        };
        return {
            name: read('OUIBOO_LEGAL_NAME'),
            ice: read('OUIBOO_LEGAL_ICE'),
            if: read('OUIBOO_LEGAL_IF'),
            rc: read('OUIBOO_LEGAL_RC'),
            address: read('OUIBOO_LEGAL_ADDRESS'),
        };
    }

    private resolveCommissionRate(override?: number): Prisma.Decimal {
        // #443 (Council P1-20): the per-request override and the env
        // configuration resolve through the SAME range validation. The
        // override path previously returned early, skipping the (0, 100]
        // check the env path applies — a caller could snapshot a 0%,
        // negative, or >100% platform service fee onto an invoice.
        let rate: Prisma.Decimal;
        if (override !== undefined && override !== null) {
            rate = toMoneyDecimal(override, 'commissionRatePercent');
        } else {
            const configured = process.env.OUIBOO_COMMISSION_RATE_PERCENT?.trim();
            if (!configured) {
                throw new BadRequestException(
                    'COMMISSION_RATE_NOT_CONFIGURED: pass commissionRatePercent or set OUIBOO_COMMISSION_RATE_PERCENT',
                );
            }
            rate = toMoneyDecimal(configured, 'OUIBOO_COMMISSION_RATE_PERCENT');
        }
        if (rate.lte(0) || rate.gt(100)) {
            throw new BadRequestException('COMMISSION_RATE_OUT_OF_RANGE: rate must be within (0, 100]');
        }
        return rate;
    }

    /**
     * Generate (or return the existing) monthly commission invoice for one
     * agency. Idempotent per (agency, period): the unique constraint plus a
     * pre-check make repeat calls return the same invoice with the same
     * number, and numbers are allocated from a per-year sequence inside the
     * same transaction that creates the invoice.
     */
    async generateMonthlyInvoice(
        agencyId: string,
        year: number,
        month: number,
        commissionRatePercent?: number,
    ) {
        if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
            throw new BadRequestException('INVALID_PERIOD: year must be 2000-2100 and month 1-12');
        }
        const periodStart = new Date(Date.UTC(year, month - 1, 1));
        const periodEnd = new Date(Date.UTC(year, month, 1));
        // #426: invoice idempotency is keyed by periodKey (INVOICE
        // documents only) — the old (agency, period) unique could not
        // represent a credit note for the same agency and month.
        const periodKey = `${agencyId}:${periodStart.toISOString()}`;

        try {
            const existing = await this.db.invoice.findUnique({
                where: { periodKey },
                include: { lineItems: { orderBy: { bookingDate: 'asc' } } },
            });
            if (existing) {
                return serializeInvoice(existing);
            }
        } catch (error) {
            if (isMissingTableError(error)) throw invoicesNotReady();
            throw error;
        }

        const agency = await this.db.agencyProfile.findUnique({
            where: { id: agencyId },
            select: {
                id: true,
                companyName: true,
                ice: true,
                subscriptionStatus: true,
                trialEndsAt: true,
                grandfatheredUntil: true,
            },
        });
        if (!agency) {
            throw new NotFoundException('Agency profile not found');
        }

        const rate = this.resolveCommissionRate(commissionRatePercent);
        const billingConfig = getBillingConfig();
        const vatRate = new Prisma.Decimal(billingConfig.vatRatePercent);

        // #426 (Council P0-10, Debate 5 rule) — the fee trigger is a
        // TERMINAL RETAINED-VALUE event, replacing the old
        // paymentStatus=PAID + confirmedAt-in-month query (and the #698
        // completed-only narrowing, which this rule supersedes):
        // a booking accrues its fee in the month of its terminal event
        // (completion / traveller cancellation / traveller no-show),
        // on a base of verified paid minus refunds completed. Bookings
        // whose retained base computes to 0 — minimum unmet, agency
        // cancellation, full refund — are excluded BY THIS RULE, never
        // by a payment-status side effect. Refunds that complete after
        // this invoice is issued reverse through credit notes
        // (generateCreditNotesForPeriod), never by editing this document.
        const candidates = await this.db.booking.findMany({
            where: {
                status: { in: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] },
                session: { template: { agencyId } },
            },
            include: {
                session: {
                    select: {
                        endDate: true,
                        template: { select: { title: true } },
                    },
                },
            },
            orderBy: [{ id: 'asc' }],
        });

        const terminal = candidates
            .map((booking) => ({
                booking,
                event: classifyTerminalEvent({
                    status: booking.status,
                    cancelledAt: booking.cancelledAt,
                    attendanceRecordedAt: booking.attendanceRecordedAt,
                    sessionEndDate: booking.session?.endDate ?? null,
                }),
            }))
            .filter(
                (entry): entry is { booking: (typeof candidates)[number]; event: NonNullable<ReturnType<typeof classifyTerminalEvent>> } =>
                    entry.event !== null &&
                    entry.event.terminalAt >= periodStart &&
                    entry.event.terminalAt < periodEnd,
            );

        // A booking is billed exactly once: skip any already carrying a
        // SERVICE_FEE line on an INVOICE document (e.g. billed in its
        // terminal month by an earlier generation).
        const candidateIds = terminal.map((entry) => entry.booking.id);
        const alreadyBilled = candidateIds.length
            ? await this.db.invoiceLineItem.findMany({
                  where: {
                      bookingId: { in: candidateIds },
                      lineType: 'SERVICE_FEE',
                      invoice: { documentType: 'INVOICE' },
                  },
                  select: { bookingId: true },
              })
            : [];
        const billedIds = new Set(alreadyBilled.map((line) => line.bookingId));

        // #435 draft trial terms (adopted Product/Trust reading of the
        // Debate 5 dissent): in the trial-expiry month only bookings
        // whose TERMINAL EVENT falls after trial expiry are billable.
        const inTrialAt = (at: Date) =>
            agency.subscriptionStatus === 'TRIAL' &&
            (agency.trialEndsAt == null || at < agency.trialEndsAt);

        type LineDraft = {
            bookingId: string | null;
            refundCaseId: string | null;
            lineType: 'SERVICE_FEE' | 'SUBSCRIPTION';
            description: string;
            bookingDate: Date;
            grossAmount: Prisma.Decimal;
            commissionRate: Prisma.Decimal;
            commissionAmount: Prisma.Decimal;
            amountHt: Prisma.Decimal;
            vatRate: Prisma.Decimal;
            vatAmount: Prisma.Decimal;
            amountTtc: Prisma.Decimal;
        };
        const lines: LineDraft[] = [];
        let feeCurrency: string | null = null;

        for (const { booking, event } of terminal) {
            if (billedIds.has(booking.id)) continue;
            if (inTrialAt(event.terminalAt)) continue;
            const { verifiedTotal, refundedTotal } = await this.getBookingLedgerTotals(booking.id);
            const retainedBase = computeRetainedBase(verifiedTotal, refundedTotal);
            if (retainedBase.lte(0)) continue;
            const currency = booking.currency || 'MAD';
            if (feeCurrency !== null && currency !== feeCurrency) {
                throw new BadRequestException('MIXED_BOOKING_CURRENCIES_FOR_PERIOD');
            }
            feeCurrency = currency;
            const fee = computeFeeLine(retainedBase, rate, vatRate);
            lines.push({
                bookingId: booking.id,
                refundCaseId: null,
                lineType: 'SERVICE_FEE',
                description: booking.session.template.title,
                bookingDate: event.terminalAt,
                grossAmount: retainedBase,
                commissionRate: rate,
                commissionAmount: fee.feeHt,
                amountHt: fee.amountHt,
                vatRate: fee.vatRate,
                vatAmount: fee.vatAmount,
                amountTtc: fee.amountTtc,
            });
        }

        // #426: the subscription stream exists in the same model. It is
        // charged only when a price is configured (billing config —
        // the price itself is undecided until the first paid month),
        // only to ACTIVE agencies (TRIAL waives the subscription; the
        // grandfathered beta cohort pays none while grandfathered).
        if (
            billingConfig.subscriptionMonthlyPriceHt !== null &&
            agency.subscriptionStatus === 'ACTIVE' &&
            !(agency.grandfatheredUntil && agency.grandfatheredUntil > periodStart)
        ) {
            const subscription = computeSubscriptionLine(billingConfig.subscriptionMonthlyPriceHt, vatRate);
            lines.push({
                bookingId: null,
                refundCaseId: null,
                lineType: 'SUBSCRIPTION',
                description: 'Ouiboo subscription (monthly)',
                bookingDate: periodStart,
                grossAmount: new Prisma.Decimal(0),
                commissionRate: new Prisma.Decimal(0),
                commissionAmount: new Prisma.Decimal(0),
                amountHt: subscription.amountHt,
                vatRate: subscription.vatRate,
                vatAmount: subscription.vatAmount,
                amountTtc: subscription.amountTtc,
            });
        }

        if (lines.length === 0) {
            throw new BadRequestException('NO_BILLABLE_BOOKINGS_FOR_PERIOD');
        }

        const currency = feeCurrency ?? 'MAD';
        const subtotalAmount = lines
            .filter((line) => line.lineType === 'SERVICE_FEE')
            .reduce((sum, line) => sum.add(line.grossAmount), new Prisma.Decimal(0));
        const totalAmount = lines.reduce((sum, line) => sum.add(line.amountHt), new Prisma.Decimal(0));
        const vatAmount = lines.reduce((sum, line) => sum.add(line.vatAmount), new Prisma.Decimal(0));
        const totalTtcAmount = totalAmount.add(vatAmount);

        const issuer = this.getIssuerLegalDetails();
        const issuedYear = new Date().getUTCFullYear();

        try {
            const invoice = await this.db.$transaction(async (tx) => {
                const sequenceValue = await this.nextSequenceValue(tx, issuedYear, 'INVOICE');
                const number = `${INVOICE_NUMBER_PREFIX}-${issuedYear}-${String(sequenceValue).padStart(4, '0')}`;
                return tx.invoice.create({
                    data: {
                        number,
                        documentType: 'INVOICE',
                        periodKey,
                        agencyId,
                        periodStart,
                        periodEnd,
                        currency,
                        commissionRate: rate,
                        subtotalAmount,
                        totalAmount,
                        vatRate,
                        vatAmount,
                        totalTtcAmount,
                        issuerName: issuer.name,
                        issuerIce: issuer.ice,
                        issuerIf: issuer.if,
                        issuerRc: issuer.rc,
                        issuerAddress: issuer.address,
                        agencyName: agency.companyName,
                        agencyIce: agency.ice,
                        lineItems: { create: lines },
                    },
                    include: { lineItems: { orderBy: { bookingDate: 'asc' } } },
                });
            });
            return serializeInvoice(invoice);
        } catch (error) {
            if (isMissingTableError(error)) throw invoicesNotReady();
            // A concurrent generation for the same agency+period won the
            // unique constraint: return the invoice it created.
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                const winner = await this.db.invoice.findUnique({
                    where: { periodKey },
                    include: { lineItems: { orderBy: { bookingDate: 'asc' } } },
                });
                if (winner) return serializeInvoice(winner);
            }
            throw error;
        }
    }

    /**
     * Verified-paid and refunds-completed totals for one booking, from
     * the append-only payment ledger (the same source #412's refund
     * effects derive from). Legacy bookings that predate the ledger
     * fall back to the VERIFIED external payments and the completed
     * refund cases, so a booking with real verified money is never
     * silently fee-free — and a booking with no verified money at all
     * accrues nothing.
     */
    private async getBookingLedgerTotals(bookingId: string) {
        const [verified, refunded] = await Promise.all([
            this.db.paymentStatusLedgerEntry.aggregate({
                where: { bookingId, type: { in: VERIFIED_LEDGER_TYPES as never[] } },
                _sum: { amount: true },
            }),
            this.db.paymentStatusLedgerEntry.aggregate({
                where: { bookingId, type: 'REFUND_COMPLETED' as never },
                _sum: { amount: true },
            }),
        ]);
        let verifiedTotal = toMoneyDecimal(verified._sum.amount ?? 0, 'verifiedTotal');
        let refundedTotal = toMoneyDecimal(refunded._sum.amount ?? 0, 'refundedTotal');
        if (verifiedTotal.lte(0)) {
            const payments = await this.db.externalPayment.findMany({
                where: { bookingId, status: 'VERIFIED' },
                select: { amount: true, confirmedAmount: true },
            });
            verifiedTotal = payments.reduce(
                (sum, payment) => sum.add(toMoneyDecimal(payment.confirmedAmount ?? payment.amount, 'confirmedAmount')),
                new Prisma.Decimal(0),
            );
        }
        if (refundedTotal.lte(0)) {
            const cases = await this.db.refundCase.findMany({
                where: { bookingId, status: 'REFUND_COMPLETED' },
                select: { approvedAmount: true, requestedAmount: true },
            });
            refundedTotal = cases.reduce(
                (sum, refundCase) =>
                    sum.add(toMoneyDecimal(refundCase.approvedAmount ?? refundCase.requestedAmount, 'approvedAmount')),
                new Prisma.Decimal(0),
            );
        }
        return { verifiedTotal, refundedTotal };
    }

    /** Allocate the next number in a document class's own series. */
    private async nextSequenceValue(
        tx: Prisma.TransactionClient,
        year: number,
        kind: 'INVOICE' | 'CREDIT_NOTE',
    ): Promise<number> {
        const rows =
            kind === 'INVOICE'
                ? await tx.$queryRaw<Array<{ lastValue: number }>>`
                    INSERT INTO "InvoiceSequence" ("year", "kind", "lastValue")
                    VALUES (${year}, 'INVOICE', 1)
                    ON CONFLICT ("year", "kind") DO UPDATE
                    SET "lastValue" = "InvoiceSequence"."lastValue" + 1
                    RETURNING "lastValue"
                `
                : await tx.$queryRaw<Array<{ lastValue: number }>>`
                    INSERT INTO "InvoiceSequence" ("year", "kind", "lastValue")
                    VALUES (${year}, 'CREDIT_NOTE', 1)
                    ON CONFLICT ("year", "kind") DO UPDATE
                    SET "lastValue" = "InvoiceSequence"."lastValue" + 1
                    RETURNING "lastValue"
                `;
        const sequenceValue = rows[0]?.lastValue;
        if (!sequenceValue) {
            throw new BadRequestException('INVOICE_SEQUENCE_UNAVAILABLE');
        }
        return sequenceValue;
    }

    /**
     * #426: the reversal limb of the Debate 5 rule. For every refund
     * that COMPLETED in the period on a booking whose fee was already
     * invoiced, issue a credit note (avoir) — its own document class,
     * its own AV- series, negative lines of rate × refunded amount
     * plus TVA — in the period the refund completes. Idempotent per
     * refund case (the line carries the case id). A refund that
     * completed BEFORE its booking's invoice was generated needs no
     * avoir: that invoice's retained base already nets it, and this
     * method skips it on the issuedAt/completedAt comparison. When the
     * avoirs against an invoice cumulatively reverse its full fee HT,
     * the invoice is marked CREDITED — the document itself is never
     * edited.
     */
    async generateCreditNotesForPeriod(agencyId: string, year: number, month: number) {
        if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
            throw new BadRequestException('INVALID_PERIOD: year must be 2000-2100 and month 1-12');
        }
        const periodStart = new Date(Date.UTC(year, month - 1, 1));
        const periodEnd = new Date(Date.UTC(year, month, 1));

        const agency = await this.db.agencyProfile.findUnique({
            where: { id: agencyId },
            select: { id: true, companyName: true, ice: true },
        });
        if (!agency) {
            throw new NotFoundException('Agency profile not found');
        }

        const cases = await this.db.refundCase.findMany({
            where: {
                agencyId,
                status: 'REFUND_COMPLETED',
                completedAt: { gte: periodStart, lt: periodEnd },
            },
            orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
        });

        type PendingLine = {
            refundCase: (typeof cases)[number];
            originalLine: {
                description: string;
                commissionRate: Prisma.Decimal;
                vatRate?: Prisma.Decimal | null;
                amountHt?: Prisma.Decimal | null;
                commissionAmount: Prisma.Decimal;
            };
            originalInvoice: InvoiceWithLines;
            amounts: ReturnType<typeof computeCreditNoteLine>;
            refundedAmount: Prisma.Decimal;
        };
        const byOriginal = new Map<string, { invoice: InvoiceWithLines; lines: PendingLine[] }>();
        let skipped = 0;

        for (const refundCase of cases) {
            const existingLine = await this.db.invoiceLineItem.findFirst({
                where: { refundCaseId: refundCase.id },
            });
            if (existingLine) {
                skipped += 1;
                continue;
            }
            const originalLine = await this.db.invoiceLineItem.findFirst({
                where: {
                    bookingId: refundCase.bookingId,
                    lineType: 'SERVICE_FEE',
                    invoice: { documentType: 'INVOICE', agencyId },
                },
                include: { invoice: { include: { lineItems: true } } },
                orderBy: { bookingDate: 'asc' },
            });
            if (!originalLine) {
                // Fee never invoiced for this booking: nothing to reverse.
                skipped += 1;
                continue;
            }
            const originalInvoice = originalLine.invoice as InvoiceWithLines;
            if (refundCase.completedAt && originalInvoice.issuedAt > refundCase.completedAt) {
                // The invoice was generated after the refund completed:
                // its retained base already nets this refund.
                skipped += 1;
                continue;
            }
            // Cap the credit at the line's still-uncredited fee HT.
            const priorCredits = await this.db.invoiceLineItem.findMany({
                where: {
                    bookingId: refundCase.bookingId,
                    lineType: 'SERVICE_FEE',
                    invoice: { documentType: 'CREDIT_NOTE', agencyId },
                },
                select: { amountHt: true },
            });
            const alreadyCredited = priorCredits.reduce(
                (sum, line) => sum.add(toMoneyDecimal(line.amountHt ?? 0, 'amountHt').abs()),
                new Prisma.Decimal(0),
            );
            const refundedAmount = toMoneyDecimal(
                refundCase.approvedAmount ?? refundCase.requestedAmount,
                'refundedAmount',
            );
            let amounts = computeCreditNoteLine(
                refundedAmount,
                originalLine.commissionRate,
                originalLine.vatRate ?? originalInvoice.vatRate ?? 20,
            );
            const remainingHt = toMoneyDecimal(originalLine.amountHt ?? originalLine.commissionAmount, 'amountHt').sub(alreadyCredited);
            if (remainingHt.lte(0)) {
                skipped += 1;
                continue;
            }
            if (amounts.amountHt.abs().gt(remainingHt)) {
                const capped = computeVatBreakdown(remainingHt, amounts.vatRate);
                amounts = {
                    feeHt: capped.amountHt.neg(),
                    amountHt: capped.amountHt.neg(),
                    vatRate: capped.vatRate,
                    vatAmount: capped.vatAmount.neg(),
                    amountTtc: capped.amountTtc.neg(),
                };
            }
            const group = byOriginal.get(originalInvoice.id) ?? { invoice: originalInvoice, lines: [] };
            group.lines.push({ refundCase, originalLine, originalInvoice, amounts, refundedAmount });
            byOriginal.set(originalInvoice.id, group);
        }

        const issuer = this.getIssuerLegalDetails();
        const issuedYear = new Date().getUTCFullYear();
        const created: ReturnType<typeof serializeInvoice>[] = [];

        for (const { invoice: originalInvoice, lines } of byOriginal.values()) {
            const totalAmount = lines.reduce((sum, line) => sum.add(line.amounts.amountHt), new Prisma.Decimal(0));
            const vatAmount = lines.reduce((sum, line) => sum.add(line.amounts.vatAmount), new Prisma.Decimal(0));
            const creditNote = await this.db.$transaction(async (tx) => {
                const sequenceValue = await this.nextSequenceValue(tx, issuedYear, 'CREDIT_NOTE');
                const number = `${CREDIT_NOTE_NUMBER_PREFIX}-${issuedYear}-${String(sequenceValue).padStart(4, '0')}`;
                return tx.invoice.create({
                    data: {
                        number,
                        documentType: 'CREDIT_NOTE',
                        periodKey: null,
                        creditNoteForId: originalInvoice.id,
                        creditReason: 'REFUND_COMPLETED',
                        agencyId,
                        periodStart,
                        periodEnd,
                        currency: originalInvoice.currency,
                        commissionRate: originalInvoice.commissionRate,
                        subtotalAmount: lines
                            .reduce((sum, line) => sum.add(line.refundedAmount), new Prisma.Decimal(0))
                            .neg(),
                        totalAmount,
                        vatRate: originalInvoice.vatRate ?? 20,
                        vatAmount,
                        totalTtcAmount: totalAmount.add(vatAmount),
                        issuerName: issuer.name,
                        issuerIce: issuer.ice,
                        issuerIf: issuer.if,
                        issuerRc: issuer.rc,
                        issuerAddress: issuer.address,
                        agencyName: agency.companyName,
                        agencyIce: agency.ice,
                        lineItems: {
                            create: lines.map((line) => ({
                                bookingId: line.refundCase.bookingId,
                                refundCaseId: line.refundCase.id,
                                lineType: 'SERVICE_FEE' as const,
                                description: line.originalLine.description,
                                bookingDate: line.refundCase.completedAt ?? periodStart,
                                grossAmount: line.refundedAmount.neg(),
                                commissionRate: line.originalLine.commissionRate,
                                commissionAmount: line.amounts.feeHt,
                                amountHt: line.amounts.amountHt,
                                vatRate: line.amounts.vatRate,
                                vatAmount: line.amounts.vatAmount,
                                amountTtc: line.amounts.amountTtc,
                            })),
                        },
                    },
                    include: { lineItems: { orderBy: { bookingDate: 'asc' } } },
                });
            });
            created.push(serializeInvoice(creditNote));

            // Mark the original CREDITED once its fee HT is fully reversed.
            const originalFeeHt = (originalInvoice.lineItems ?? [])
                .filter((line) => (line.lineType ?? 'SERVICE_FEE') === 'SERVICE_FEE')
                .reduce((sum, line) => sum.add(toMoneyDecimal(line.amountHt ?? line.commissionAmount, 'amountHt')), new Prisma.Decimal(0));
            const allCredits = await this.db.invoiceLineItem.findMany({
                where: {
                    bookingId: { in: (originalInvoice.lineItems ?? []).map((line) => line.bookingId).filter((id): id is string => !!id) },
                    lineType: 'SERVICE_FEE',
                    invoice: { documentType: 'CREDIT_NOTE', creditNoteForId: originalInvoice.id },
                },
                select: { amountHt: true },
            });
            const creditedHt = allCredits.reduce(
                (sum, line) => sum.add(toMoneyDecimal(line.amountHt ?? 0, 'amountHt').abs()),
                new Prisma.Decimal(0),
            );
            if (originalFeeHt.gt(0) && creditedHt.gte(originalFeeHt)) {
                await this.db.invoice.update({
                    where: { id: originalInvoice.id },
                    data: { status: 'CREDITED' },
                });
            }
        }

        return { data: created, skipped };
    }

    async listAgencyInvoices(agencyId: string, pageParam?: string, limitParam?: string) {
        const { page, limit } = parseInvoicePagination(pageParam, limitParam);
        try {
            const [invoices, total] = await Promise.all([
                this.db.invoice.findMany({
                    where: { agencyId },
                    include: { lineItems: { orderBy: { bookingDate: 'asc' } } },
                    orderBy: [{ periodStart: 'desc' }, { issuedAt: 'desc' }],
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                this.db.invoice.count({ where: { agencyId } }),
            ]);
            return {
                data: invoices.map(serializeInvoice),
                pagination: buildInvoicePaginationMeta(total, page, limit),
            };
        } catch (error) {
            if (isMissingTableError(error)) {
                // Pre-migration the billing page must still render: empty list.
                return { data: [], pagination: buildInvoicePaginationMeta(0, page, limit) };
            }
            throw error;
        }
    }

    async getAgencyInvoice(agencyId: string, invoiceId: string) {
        let invoice: InvoiceWithLines | null;
        try {
            invoice = await this.db.invoice.findFirst({
                where: { id: invoiceId, agencyId },
                include: { lineItems: { orderBy: { bookingDate: 'asc' } } },
            });
        } catch (error) {
            if (isMissingTableError(error)) throw invoicesNotReady();
            throw error;
        }
        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }
        return serializeInvoice(invoice);
    }

    async listAllInvoices(params: {
        pageParam?: string;
        limitParam?: string;
        agencyId?: string;
        q?: string;
    }) {
        const { page, limit } = parseInvoicePagination(params.pageParam, params.limitParam);
        const search = params.q?.trim();
        const where: Prisma.InvoiceWhereInput = {
            ...(params.agencyId ? { agencyId: params.agencyId } : {}),
            ...(search
                ? {
                    OR: [
                        { number: { contains: search, mode: 'insensitive' as const } },
                        { agencyName: { contains: search, mode: 'insensitive' as const } },
                    ],
                }
                : {}),
        };
        try {
            const [invoices, total] = await Promise.all([
                this.db.invoice.findMany({
                    where,
                    include: { lineItems: { orderBy: { bookingDate: 'asc' } } },
                    orderBy: [{ issuedAt: 'desc' }],
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                this.db.invoice.count({ where }),
            ]);
            return {
                data: invoices.map(serializeInvoice),
                pagination: buildInvoicePaginationMeta(total, page, limit),
            };
        } catch (error) {
            if (isMissingTableError(error)) {
                return { data: [], pagination: buildInvoicePaginationMeta(0, page, limit) };
            }
            throw error;
        }
    }

    async getInvoiceById(invoiceId: string) {
        let invoice: InvoiceWithLines | null;
        try {
            invoice = await this.db.invoice.findUnique({
                where: { id: invoiceId },
                include: { lineItems: { orderBy: { bookingDate: 'asc' } } },
            });
        } catch (error) {
            if (isMissingTableError(error)) throw invoicesNotReady();
            throw error;
        }
        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }
        return serializeInvoice(invoice);
    }
}
