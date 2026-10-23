import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';

describe('InvoicesService (#359)', () => {
    const agency = { id: 'agency-1', companyName: 'Atlas Adventures SARL', ice: 'ICE-AGENCY-1' };

    const makeBooking = (id: string, total: string, day: number) => ({
        id,
        currency: 'MAD',
        totalAmount: new Prisma.Decimal(total),
        confirmedAt: new Date(Date.UTC(2026, 9, day)),
        bookingDate: new Date(Date.UTC(2026, 9, day)),
        session: { template: { title: `Trip ${id}` } },
    });

    const createdInvoices: Array<Record<string, unknown>> = [];
    let sequenceValue = 0;
    let existingInvoice: Record<string, unknown> | null = null;
    let bookings: ReturnType<typeof makeBooking>[] = [];

    const db = {
        invoice: {
            findUnique: jest.fn(async () => existingInvoice),
            findFirst: jest.fn(async () => existingInvoice),
            create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
                createdInvoices.push(data);
                return {
                    id: 'invoice-1',
                    status: 'ISSUED',
                    issuedAt: new Date(),
                    createdAt: new Date(),
                    issuerName: null,
                    issuerIce: null,
                    issuerRc: null,
                    issuerAddress: null,
                    ...data,
                    lineItems: (data.lineItems as { create: Array<Record<string, unknown>> }).create.map(
                        (line, i) => ({ id: `line-${i}`, invoiceId: 'invoice-1', ...line }),
                    ),
                };
            }),
            findMany: jest.fn(async () => []),
            count: jest.fn(async () => 0),
        },
        agencyProfile: {
            findUnique: jest.fn(async () => agency),
        },
        booking: {
            findMany: jest.fn(async () => bookings),
        },
        $transaction: jest.fn(async (fn: (tx: unknown) => unknown) =>
            fn({
                $queryRaw: jest.fn(async () => [{ lastValue: ++sequenceValue }]),
                invoice: db.invoice,
            }),
        ),
    };

    const service = new InvoicesService(db as never);

    beforeEach(() => {
        createdInvoices.length = 0;
        sequenceValue = 0;
        existingInvoice = null;
        bookings = [];
        jest.clearAllMocks();
        delete process.env.OUIBOO_COMMISSION_RATE_PERCENT;
        db.invoice.findUnique.mockImplementation(async () => existingInvoice);
        db.agencyProfile.findUnique.mockResolvedValue(agency);
        db.booking.findMany.mockImplementation(async () => bookings);
        db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
            fn({
                $queryRaw: jest.fn(async () => [{ lastValue: ++sequenceValue }]),
                invoice: db.invoice,
            }),
        );
    });

    it('allocates sequential numbers INV-<year>-0001, INV-<year>-0002 across generations', async () => {
        bookings = [makeBooking('b1', '1000.00', 3)];
        const year = new Date().getUTCFullYear();
        const first = await service.generateMonthlyInvoice('agency-1', 2026, 10, 10);
        const second = await service.generateMonthlyInvoice('agency-1', 2026, 9, 10);
        expect(first.number).toBe(`INV-${year}-0001`);
        expect(second.number).toBe(`INV-${year}-0002`);
    });

    it('computes per-booking fee lines and totals from booking totals at the applied rate', async () => {
        bookings = [makeBooking('b1', '1000.00', 3), makeBooking('b2', '2500.50', 12)];
        const invoice = await service.generateMonthlyInvoice('agency-1', 2026, 10, 10);
        expect(invoice.subtotalAmount).toBe('3500.50');
        expect(invoice.totalAmount).toBe('350.05');
        expect(invoice.commissionRate).toBe('10.00');
        expect(invoice.lineItems).toHaveLength(2);
        expect(invoice.lineItems[0]).toMatchObject({ bookingId: 'b1', grossAmount: '1000.00', commissionAmount: '100.00' });
        expect(invoice.lineItems[1]).toMatchObject({ bookingId: 'b2', grossAmount: '2500.50', commissionAmount: '250.05' });
        // Legal snapshots: agency from profile; issuer stays null while unconfigured.
        expect(invoice.agencyName).toBe('Atlas Adventures SARL');
        expect(invoice.agencyIce).toBe('ICE-AGENCY-1');
        expect(invoice.issuerIce).toBeNull();
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
        await expect(service.generateMonthlyInvoice('agency-1', 2026, 10)).rejects.toThrow(BadRequestException);
        expect(db.invoice.create).not.toHaveBeenCalled();
    });

    it('uses the configured env rate when no per-request rate is given', async () => {
        process.env.OUIBOO_COMMISSION_RATE_PERCENT = '5';
        bookings = [makeBooking('b1', '2000.00', 3)];
        const invoice = await service.generateMonthlyInvoice('agency-1', 2026, 10);
        expect(invoice.totalAmount).toBe('100.00');
        expect(invoice.commissionRate).toBe('5.00');
    });

    it('rejects a period with no billable bookings', async () => {
        bookings = [];
        await expect(service.generateMonthlyInvoice('agency-1', 2026, 10, 10)).rejects.toThrow(/NO_BILLABLE_BOOKINGS/);
    });

    it('rejects an unknown agency', async () => {
        db.agencyProfile.findUnique.mockResolvedValue(null as never);
        await expect(service.generateMonthlyInvoice('agency-x', 2026, 10, 10)).rejects.toThrow(NotFoundException);
    });

    it('rejects an invalid period', async () => {
        await expect(service.generateMonthlyInvoice('agency-1', 2026, 13, 10)).rejects.toThrow(BadRequestException);
    });

    it('reads issuer legal details from env and leaves them null when unset', () => {
        expect(service.getIssuerLegalDetails()).toEqual({ name: null, ice: null, rc: null, address: null });
        process.env.OUIBOO_LEGAL_NAME = 'Ouiboo SARL';
        process.env.OUIBOO_LEGAL_ICE = 'ICE-OUIBOO-1';
        try {
            expect(service.getIssuerLegalDetails()).toMatchObject({ name: 'Ouiboo SARL', ice: 'ICE-OUIBOO-1', rc: null });
        } finally {
            delete process.env.OUIBOO_LEGAL_NAME;
            delete process.env.OUIBOO_LEGAL_ICE;
        }
    });
});

describe('InvoicePdfService (#359)', () => {
    it('renders a valid PDF buffer from a stored invoice record', async () => {
        const pdf = new InvoicePdfService();
        const buffer = await pdf.render({
            id: 'invoice-1',
            number: 'INV-2026-0001',
            agencyId: 'agency-1',
            agencyName: 'Atlas Adventures SARL',
            agencyIce: 'ICE-AGENCY-1',
            periodStart: new Date(Date.UTC(2026, 9, 1)),
            periodEnd: new Date(Date.UTC(2026, 10, 1)),
            currency: 'MAD',
            commissionRate: '10.00',
            subtotalAmount: '3500.50',
            totalAmount: '350.05',
            status: 'ISSUED',
            issuerName: null,
            issuerIce: null,
            issuerRc: null,
            issuerAddress: null,
            issuedAt: new Date(Date.UTC(2026, 10, 2)),
            lineItems: [
                {
                    id: 'line-1',
                    bookingId: 'b1',
                    description: 'Sahara Trek',
                    bookingDate: new Date(Date.UTC(2026, 9, 3)),
                    grossAmount: '1000.00',
                    commissionRate: '10.00',
                    commissionAmount: '100.00',
                },
            ],
        } as never);
        expect(buffer.subarray(0, 4).toString('utf8')).toBe('%PDF');
        expect(buffer.length).toBeGreaterThan(500);
    });
});
