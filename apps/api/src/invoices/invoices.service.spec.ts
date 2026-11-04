import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';

describe('InvoicesService (#359, fiscal rebuild #426)', () => {
    const agency = {
        id: 'agency-1',
        companyName: 'Atlas Adventures SARL',
        ice: 'ICE-AGENCY-1',
        subscriptionStatus: 'ACTIVE',
        trialEndsAt: null as Date | null,
        grandfatheredUntil: null as Date | null,
    };

    type BookingFixture = ReturnType<typeof makeBooking>;
    const makeBooking = (
        id: string,
        total: string,
        day: number,
        opts: {
            status?: string;
            cancelledAt?: Date | null;
            attendanceRecordedAt?: Date | null;
            currency?: string;
        } = {},
    ) => ({
        id,
        currency: opts.currency ?? 'MAD',
        totalAmount: new Prisma.Decimal(total),
        status: opts.status ?? 'COMPLETED',
        cancelledAt: opts.cancelledAt ?? null,
        attendanceRecordedAt: opts.attendanceRecordedAt ?? null,
        confirmedAt: new Date(Date.UTC(2026, 9, day)),
        bookingDate: new Date(Date.UTC(2026, 9, day)),
        session: {
            endDate: new Date(Date.UTC(2026, 9, day)),
            template: { title: `Trip ${id}` },
        },
    });

    const createdInvoices: Array<Record<string, unknown>> = [];
    let sequenceValue = 0;
    let existingInvoice: Record<string, unknown> | null = null;
    let bookings: BookingFixture[] = [];
    // Ledger facts per booking: the retained-base source (#426).
    let ledger = new Map<string, { verified: string; refunded: string }>();
    let refundCases: Array<Record<string, unknown>> = [];
    let originalLine: Record<string, unknown> | null = null;
    const updatedInvoices: Array<Record<string, unknown>> = [];

    const db = {
        invoice: {
            findUnique: jest.fn(async () => existingInvoice),
            findFirst: jest.fn(async () => existingInvoice),
            create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
                createdInvoices.push(data);
                return {
                    id: `invoice-${createdInvoices.length}`,
                    status: 'ISSUED',
                    issuedAt: new Date(),
                    createdAt: new Date(),
                    issuerName: null,
                    issuerIce: null,
                    issuerIf: null,
                    issuerRc: null,
                    issuerAddress: null,
                    documentType: 'INVOICE',
                    creditNoteForId: null,
                    creditReason: null,
                    vatRate: new Prisma.Decimal(20),
                    vatAmount: new Prisma.Decimal(0),
                    totalTtcAmount: new Prisma.Decimal(0),
                    ...data,
                    lineItems: (
                        data.lineItems as { create: Array<Record<string, unknown>> }
                    ).create.map((line, i) => ({ id: `line-${i}`, invoiceId: 'invoice-1', ...line })),
                };
            }),
            update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
                updatedInvoices.push({ where, data });
                return { id: where.id, ...data };
            }),
            findMany: jest.fn(async () => []),
            count: jest.fn(async () => 0),
        },
        invoiceLineItem: {
            findMany: jest.fn(async ({ where }: { where: Record<string, any> }) => {
                const docType = where?.invoice?.documentType;
                if (docType === 'CREDIT_NOTE') {
                    // Prior credits as created by this spec's credit-note run.
                    return createdInvoices
                        .filter((inv) => inv.documentType === 'CREDIT_NOTE')
                        .flatMap((inv) =>
                            (
                                inv.lineItems as { create: Array<Record<string, unknown>> }
                            ).create.map((line) => ({ amountHt: line.amountHt })),
                        );
                }
                return [];
            }),
            findFirst: jest.fn(async ({ where }: { where: Record<string, any> }) => {
                if (where?.refundCaseId) return null;
                return originalLine;
            }),
        },
        agencyProfile: {
            findUnique: jest.fn(async () => agency),
        },
        booking: {
            findMany: jest.fn(async () => bookings),
        },
        paymentStatusLedgerEntry: {
            aggregate: jest.fn(
                async ({ where }: { where: { bookingId: string; type: unknown } }) => {
                    const facts = ledger.get(where.bookingId) ?? { verified: '0', refunded: '0' };
                    const isVerified = typeof where.type === 'object' && where.type !== null && 'in' in (where.type as object);
                    return {
                        _sum: {
                            amount: new Prisma.Decimal(isVerified ? facts.verified : facts.refunded),
                        },
                    };
                },
            ),
        },
        externalPayment: {
            findMany: jest.fn(async () => []),
        },
        refundCase: {
            findMany: jest.fn(async () => refundCases),
        },
        $transaction: jest.fn(async (fn: (tx: unknown) => unknown) =>
            fn({
                $queryRaw: jest.fn(async () => [{ lastValue: ++sequenceValue }]),
                invoice: db.invoice,
            }),
        ),
    };

    const service = new InvoicesService(db as never);

    const setLedger = (id: string, verified: string, refunded = '0') =>
        ledger.set(id, { verified, refunded });

    beforeEach(() => {
        createdInvoices.length = 0;
        updatedInvoices.length = 0;
        sequenceValue = 0;
        existingInvoice = null;
        bookings = [];
        ledger = new Map();
        refundCases = [];
        originalLine = null;
        jest.clearAllMocks();
        delete process.env.OUIBOO_COMMISSION_RATE_PERCENT;
        delete process.env.OUIBOO_SUBSCRIPTION_PRICE_HT_MAD;
        delete process.env.OUIBOO_VAT_RATE_PERCENT;
        db.invoice.findUnique.mockImplementation(async () => existingInvoice);
        db.invoiceLineItem.findMany.mockImplementation(async ({ where }: { where: Record<string, any> }) => {
            const docType = where?.invoice?.documentType;
            if (docType === 'CREDIT_NOTE') {
                return createdInvoices
                    .filter((inv) => inv.documentType === 'CREDIT_NOTE')
                    .flatMap((inv) =>
                        (inv.lineItems as { create: Array<Record<string, unknown>> }).create.map(
                            (line) => ({ amountHt: line.amountHt }),
                        ),
                    );
            }
            return [];
        });
        db.invoiceLineItem.findFirst.mockImplementation(async ({ where }: { where: Record<string, any> }) => {
            if (where?.refundCaseId) return null;
            return originalLine;
        });
        db.agencyProfile.findUnique.mockResolvedValue(agency as never);
        db.booking.findMany.mockImplementation(async () => bookings as never);
        db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
            fn({
                $queryRaw: jest.fn(async () => [{ lastValue: ++sequenceValue }]),
                invoice: db.invoice,
            }),
        );
    });

    it('allocates sequential numbers INV-<year>-0001, INV-<year>-0002 across generations', async () => {
        // One booking terminating in October, one in September —
        // aggregation is by terminal-event month (#426).
        const oct = makeBooking('b1', '1000.00', 3);
        const sep = makeBooking('b2', '1000.00', 3);
        sep.session.endDate = new Date(Date.UTC(2026, 8, 3));
        bookings = [oct, sep];
        setLedger('b1', '1000.00');
        setLedger('b2', '1000.00');
        const year = new Date().getUTCFullYear();
        const first = await service.generateMonthlyInvoice('agency-1', 2026, 10, 10);
        const second = await service.generateMonthlyInvoice('agency-1', 2026, 9, 10);
        expect(first.number).toBe(`INV-${year}-0001`);
        expect(second.number).toBe(`INV-${year}-0002`);
        expect(first.lineItems[0].bookingId).toBe('b1');
        expect(second.lineItems[0].bookingId).toBe('b2');
    });

    it('(a) computes fee HT + TVA + TTC per line on the retained base', async () => {
        bookings = [makeBooking('b1', '1000.00', 3), makeBooking('b2', '2500.50', 12)];
        setLedger('b1', '1000.00');
        setLedger('b2', '2500.50');
        const invoice = await service.generateMonthlyInvoice('agency-1', 2026, 10, 10);
        expect(invoice.subtotalAmount).toBe('3500.50');
        expect(invoice.totalAmount).toBe('350.05');
        expect(invoice.vatRate).toBe('20.00');
        expect(invoice.vatAmount).toBe('70.01');
        expect(invoice.totalTtcAmount).toBe('420.06');
        expect(invoice.commissionRate).toBe('10.00');
        expect(invoice.documentType).toBe('INVOICE');
        expect(invoice.lineItems).toHaveLength(2);
        expect(invoice.lineItems[0]).toMatchObject({
            bookingId: 'b1',
            grossAmount: '1000.00',
            commissionAmount: '100.00',
            amountHt: '100.00',
            vatAmount: '20.00',
            amountTtc: '120.00',
            lineType: 'SERVICE_FEE',
        });
        expect(invoice.lineItems[1]).toMatchObject({ bookingId: 'b2', grossAmount: '2500.50', commissionAmount: '250.05' });
        expect(invoice.agencyName).toBe('Atlas Adventures SARL');
        expect(invoice.agencyIce).toBe('ICE-AGENCY-1');
        expect(invoice.issuerIce).toBeNull();
        expect(invoice.issuerIf).toBeNull();
    });

    it('(b) service level: deposit-cancel with 200 retained bills 24.00 TTC', async () => {
        bookings = [
            makeBooking('b1', '2000.00', 5, {
                status: 'CANCELLED',
                cancelledAt: new Date(Date.UTC(2026, 9, 5)),
            }),
        ];
        setLedger('b1', '600.00', '400.00');
        const invoice = await service.generateMonthlyInvoice('agency-1', 2026, 10, 10);
        expect(invoice.lineItems).toHaveLength(1);
        expect(invoice.lineItems[0]).toMatchObject({
            grossAmount: '200.00',
            amountHt: '20.00',
            vatAmount: '4.00',
            amountTtc: '24.00',
        });
        expect(invoice.totalTtcAmount).toBe('24.00');
    });

    it('(c) service level: agency-cancelled, fully refunded booking bills nothing', async () => {
        bookings = [
            makeBooking('b1', '2000.00', 5, {
                status: 'CANCELLED',
                cancelledAt: new Date(Date.UTC(2026, 9, 5)),
            }),
        ];
        setLedger('b1', '2000.00', '2000.00');
        await expect(service.generateMonthlyInvoice('agency-1', 2026, 10, 10)).rejects.toThrow(
            /NO_BILLABLE_BOOKINGS/,
        );
        expect(db.invoice.create).not.toHaveBeenCalled();
    });

    it('(e) service level: traveller no-show with full retention bills 240.00 TTC', async () => {
        bookings = [
            makeBooking('b1', '2000.00', 12, {
                status: 'NO_SHOW',
                attendanceRecordedAt: new Date(Date.UTC(2026, 9, 12)),
            }),
        ];
        setLedger('b1', '2000.00');
        const invoice = await service.generateMonthlyInvoice('agency-1', 2026, 10, 10);
        expect(invoice.totalAmount).toBe('200.00');
        expect(invoice.totalTtcAmount).toBe('240.00');
    });

    it('(d) service level: trial-expiry month bills only post-expiry terminal events (12,800.00 TTC)', async () => {
        db.agencyProfile.findUnique.mockResolvedValue({
            ...agency,
            subscriptionStatus: 'TRIAL',
            trialEndsAt: new Date(Date.UTC(2026, 9, 15)),
        } as never);
        bookings = [makeBooking('pre', '200000.00', 5), makeBooking('post', '200000.00', 20)];
        setLedger('pre', '93333.33');
        setLedger('post', '106666.67');
        const invoice = await service.generateMonthlyInvoice('agency-1', 2026, 10, 10);
        expect(invoice.lineItems).toHaveLength(1);
        expect(invoice.lineItems[0].bookingId).toBe('post');
        expect(invoice.totalAmount).toBe('10666.67');
        expect(invoice.vatAmount).toBe('2133.33');
        expect(invoice.totalTtcAmount).toBe('12800.00');
    });

    it('bills the subscription in the same model when a price is configured (299 HT → 358.80 TTC)', async () => {
        process.env.OUIBOO_SUBSCRIPTION_PRICE_HT_MAD = '299';
        const invoice = await service.generateMonthlyInvoice('agency-1', 2026, 10, 10);
        expect(invoice.lineItems).toHaveLength(1);
        expect(invoice.lineItems[0]).toMatchObject({
            lineType: 'SUBSCRIPTION',
            bookingId: null,
            amountHt: '299.00',
            vatAmount: '59.80',
            amountTtc: '358.80',
        });
        expect(invoice.totalTtcAmount).toBe('358.80');
    });

    it('never bills a booking twice: an already-invoiced booking is skipped', async () => {
        bookings = [makeBooking('b1', '1000.00', 3)];
        setLedger('b1', '1000.00');
        db.invoiceLineItem.findMany.mockImplementation(async ({ where }: { where: Record<string, any> }) =>
            where?.invoice?.documentType === 'INVOICE' ? [{ bookingId: 'b1' }] : [],
        );
        await expect(service.generateMonthlyInvoice('agency-1', 2026, 10, 10)).rejects.toThrow(
            /NO_BILLABLE_BOOKINGS/,
        );
    });

    it('issues an avoir (AV- series) reversing rate × refunded + TVA, and marks the original CREDITED', async () => {
        const originalInvoice = {
            id: 'inv-1',
            number: 'INV-2026-0001',
            documentType: 'INVOICE',
            agencyId: 'agency-1',
            agencyName: agency.companyName,
            agencyIce: agency.ice,
            periodStart: new Date(Date.UTC(2026, 9, 1)),
            periodEnd: new Date(Date.UTC(2026, 10, 1)),
            currency: 'MAD',
            commissionRate: new Prisma.Decimal('10.00'),
            subtotalAmount: new Prisma.Decimal('2000.00'),
            totalAmount: new Prisma.Decimal('200.00'),
            vatRate: new Prisma.Decimal(20),
            vatAmount: new Prisma.Decimal('40.00'),
            totalTtcAmount: new Prisma.Decimal('240.00'),
            status: 'ISSUED',
            issuerName: null,
            issuerIce: null,
            issuerIf: null,
            issuerRc: null,
            issuerAddress: null,
            creditNoteForId: null,
            creditReason: null,
            issuedAt: new Date(Date.UTC(2026, 9, 2)),
            lineItems: [
                {
                    id: 'line-1',
                    bookingId: 'b1',
                    refundCaseId: null,
                    lineType: 'SERVICE_FEE',
                    description: 'Trip b1',
                    bookingDate: new Date(Date.UTC(2026, 9, 3)),
                    grossAmount: new Prisma.Decimal('2000.00'),
                    commissionRate: new Prisma.Decimal('10.00'),
                    commissionAmount: new Prisma.Decimal('200.00'),
                    amountHt: new Prisma.Decimal('200.00'),
                    vatRate: new Prisma.Decimal(20),
                    vatAmount: new Prisma.Decimal('40.00'),
                    amountTtc: new Prisma.Decimal('240.00'),
                },
            ],
        };
        originalLine = { ...originalInvoice.lineItems[0], invoice: originalInvoice };
        refundCases = [
            {
                id: 'case-1',
                bookingId: 'b1',
                agencyId: 'agency-1',
                status: 'REFUND_COMPLETED',
                approvedAmount: new Prisma.Decimal('2000.00'),
                requestedAmount: new Prisma.Decimal('2000.00'),
                completedAt: new Date(Date.UTC(2026, 9, 20)),
            },
        ];
        const result = await service.generateCreditNotesForPeriod('agency-1', 2026, 10);
        expect(result.skipped).toBe(0);
        expect(result.data).toHaveLength(1);
        const creditNote = result.data[0];
        const year = new Date().getUTCFullYear();
        expect(creditNote.number).toBe(`AV-${year}-0001`);
        expect(creditNote.documentType).toBe('CREDIT_NOTE');
        expect(creditNote.creditNoteForId).toBe('inv-1');
        expect(creditNote.totalAmount).toBe('-200.00');
        expect(creditNote.vatAmount).toBe('-40.00');
        expect(creditNote.totalTtcAmount).toBe('-240.00');
        expect(creditNote.lineItems[0]).toMatchObject({
            bookingId: 'b1',
            refundCaseId: 'case-1',
            amountHt: '-200.00',
            amountTtc: '-240.00',
        });
        expect(updatedInvoices).toContainEqual({
            where: { id: 'inv-1' },
            data: { status: 'CREDITED' },
        });
    });

    it('credit notes are idempotent per refund case and skip never-invoiced bookings', async () => {
        refundCases = [
            {
                id: 'case-9',
                bookingId: 'b-never-billed',
                agencyId: 'agency-1',
                status: 'REFUND_COMPLETED',
                approvedAmount: new Prisma.Decimal('500.00'),
                requestedAmount: new Prisma.Decimal('500.00'),
                completedAt: new Date(Date.UTC(2026, 9, 20)),
            },
        ];
        originalLine = null;
        const result = await service.generateCreditNotesForPeriod('agency-1', 2026, 10);
        expect(result.data).toHaveLength(0);
        expect(result.skipped).toBe(1);
        expect(db.invoice.create).not.toHaveBeenCalled();
    });

    it('is idempotent: an existing invoice for agency+period is returned and no number is allocated', async () => {
        existingInvoice = {
            id: 'invoice-existing',
            number: 'INV-2026-0007',
            agencyId: 'agency-1',
            agencyName: agency.companyName,
            agencyIce: agency.ice,
            periodStart: new Date(Date.UTC(2026, 9, 1)),
            periodEnd: new Date(Date.UTC(2026, 10, 1)),
            currency: 'MAD',
            commissionRate: new Prisma.Decimal('10.00'),
            subtotalAmount: new Prisma.Decimal('1000.00'),
            totalAmount: new Prisma.Decimal('100.00'),
            status: 'ISSUED',
            issuerName: null,
            issuerIce: null,
            issuerRc: null,
            issuerAddress: null,
            issuedAt: new Date(),
            lineItems: [],
        } as never;
        const result = await service.generateMonthlyInvoice('agency-1', 2026, 10, 10);
        expect(result.number).toBe('INV-2026-0007');
        expect(db.$transaction).not.toHaveBeenCalled();
        expect(db.invoice.create).not.toHaveBeenCalled();
        expect(sequenceValue).toBe(0);
    });

    it('fails closed when no fee rate is provided or configured', async () => {
        bookings = [makeBooking('b1', '1000.00', 3)];
        setLedger('b1', '1000.00');
        await expect(service.generateMonthlyInvoice('agency-1', 2026, 10)).rejects.toThrow(BadRequestException);
        expect(db.invoice.create).not.toHaveBeenCalled();
    });

    it('applies the env-path range validation to the per-request override (#443)', async () => {
        bookings = [makeBooking('b1', '1000.00', 3)];
        setLedger('b1', '1000.00');
        for (const bad of [0, -5, 100.01, 150]) {
            const error = await service
                .generateMonthlyInvoice('agency-1', 2026, 10, bad)
                .catch((e: unknown) => e);
            expect(error).toBeInstanceOf(BadRequestException);
            expect((error as BadRequestException).message).toContain('COMMISSION_RATE_OUT_OF_RANGE');
        }
        expect(db.invoice.create).not.toHaveBeenCalled();
        const invoice = await service.generateMonthlyInvoice('agency-1', 2026, 10, 100);
        expect(invoice.commissionRate).toBe('100.00');
    });

    it('uses the configured env rate when no per-request rate is given', async () => {
        process.env.OUIBOO_COMMISSION_RATE_PERCENT = '5';
        bookings = [makeBooking('b1', '2000.00', 3)];
        setLedger('b1', '2000.00');
        const invoice = await service.generateMonthlyInvoice('agency-1', 2026, 10);
        expect(invoice.totalAmount).toBe('100.00');
        expect(invoice.commissionRate).toBe('5.00');
    });

    it('rejects a period with no billable bookings', async () => {
        bookings = [];
        await expect(service.generateMonthlyInvoice('agency-1', 2026, 10, 10)).rejects.toThrow(/NO_BILLABLE_BOOKINGS/);
    });

    it('surfaces the stable error codes the admin UI maps to specific messages (#374)', async () => {
        bookings = [];
        const noBillable = await service
            .generateMonthlyInvoice('agency-1', 2026, 10, 10)
            .catch((error: unknown) => error);
        expect(noBillable).toBeInstanceOf(BadRequestException);
        expect((noBillable as BadRequestException).message).toBe('NO_BILLABLE_BOOKINGS_FOR_PERIOD');

        bookings = [makeBooking('b1', '1000.00', 3)];
        setLedger('b1', '1000.00');
        const noRate = await service.generateMonthlyInvoice('agency-1', 2026, 10).catch((error: unknown) => error);
        expect(noRate).toBeInstanceOf(BadRequestException);
        expect((noRate as BadRequestException).message).toContain('COMMISSION_RATE_NOT_CONFIGURED');
    });

    it('rejects an unknown agency', async () => {
        db.agencyProfile.findUnique.mockResolvedValue(null as never);
        await expect(service.generateMonthlyInvoice('agency-x', 2026, 10, 10)).rejects.toThrow(NotFoundException);
    });

    it('rejects an invalid period', async () => {
        await expect(service.generateMonthlyInvoice('agency-1', 2026, 13, 10)).rejects.toThrow(BadRequestException);
    });

    it('reads issuer legal details from env and leaves them null when unset', () => {
        expect(service.getIssuerLegalDetails()).toEqual({ name: null, ice: null, if: null, rc: null, address: null });
        process.env.OUIBOO_LEGAL_NAME = 'Ouiboo SARL';
        process.env.OUIBOO_LEGAL_ICE = 'ICE-OUIBOO-1';
        process.env.OUIBOO_LEGAL_IF = 'IF-OUIBOO-1';
        try {
            expect(service.getIssuerLegalDetails()).toMatchObject({
                name: 'Ouiboo SARL',
                ice: 'ICE-OUIBOO-1',
                if: 'IF-OUIBOO-1',
                rc: null,
            });
        } finally {
            delete process.env.OUIBOO_LEGAL_NAME;
            delete process.env.OUIBOO_LEGAL_ICE;
            delete process.env.OUIBOO_LEGAL_IF;
        }
    });
});

describe('InvoicePdfService (#359)', () => {
    it('renders a valid PDF buffer from a stored invoice record', async () => {
        const pdf = new InvoicePdfService();
        const buffer = await pdf.render({
            id: 'invoice-1',
            number: 'INV-2026-0001',
            documentType: 'INVOICE',
            creditNoteForId: null,
            creditReason: null,
            agencyId: 'agency-1',
            agencyName: 'Atlas Adventures SARL',
            agencyIce: 'ICE-AGENCY-1',
            periodStart: new Date(Date.UTC(2026, 9, 1)),
            periodEnd: new Date(Date.UTC(2026, 10, 1)),
            currency: 'MAD',
            commissionRate: '10.00',
            subtotalAmount: '3500.50',
            totalAmount: '350.05',
            vatRate: '20.00',
            vatAmount: '70.01',
            totalTtcAmount: '420.06',
            status: 'ISSUED',
            issuerName: null,
            issuerIce: null,
            issuerIf: null,
            issuerRc: null,
            issuerAddress: null,
            issuedAt: new Date(Date.UTC(2026, 10, 2)),
            lineItems: [
                {
                    id: 'line-1',
                    bookingId: 'b1',
                    refundCaseId: null,
                    lineType: 'SERVICE_FEE',
                    description: 'Sahara Trek',
                    bookingDate: new Date(Date.UTC(2026, 9, 3)),
                    grossAmount: '1000.00',
                    commissionRate: '10.00',
                    commissionAmount: '100.00',
                    amountHt: '100.00',
                    vatRate: '20.00',
                    vatAmount: '20.00',
                    amountTtc: '120.00',
                },
            ],
        } as never);
        expect(buffer.subarray(0, 4).toString('utf8')).toBe('%PDF');
        expect(buffer.length).toBeGreaterThan(500);
    });
});
