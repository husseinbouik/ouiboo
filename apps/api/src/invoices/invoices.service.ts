import {
    BadRequestException,
    Injectable,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { toMoneyDecimal, toMoneyString } from '../common/money.util';

export interface IssuerLegalDetails {
    name: string | null;
    ice: string | null;
    rc: string | null;
    address: string | null;
}

const INVOICE_NUMBER_PREFIX = 'INV';

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
    agencyId: invoice.agencyId,
    agencyName: invoice.agencyName,
    agencyIce: invoice.agencyIce,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    currency: invoice.currency,
    commissionRate: new Prisma.Decimal(invoice.commissionRate).toFixed(2),
    subtotalAmount: toMoneyString(invoice.subtotalAmount),
    totalAmount: toMoneyString(invoice.totalAmount),
    status: invoice.status,
    issuerName: invoice.issuerName,
    issuerIce: invoice.issuerIce,
    issuerRc: invoice.issuerRc,
    issuerAddress: invoice.issuerAddress,
    issuedAt: invoice.issuedAt,
    lineItems: (invoice.lineItems ?? []).map((line) => ({
        id: line.id,
        bookingId: line.bookingId,
        description: line.description,
        bookingDate: line.bookingDate,
        grossAmount: toMoneyString(line.grossAmount),
        commissionRate: new Prisma.Decimal(line.commissionRate).toFixed(2),
        commissionAmount: toMoneyString(line.commissionAmount),
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

        try {
            const existing = await this.db.invoice.findUnique({
                where: { agencyId_periodStart_periodEnd: { agencyId, periodStart, periodEnd } },
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
            select: { id: true, companyName: true, ice: true },
        });
        if (!agency) {
            throw new NotFoundException('Agency profile not found');
        }

        const rate = this.resolveCommissionRate(commissionRatePercent);

        // Billable = paid bookings of this agency confirmed inside the period.
        // The wallet ledger credits the full booking amount to the agency
        // (travelers pay the agency directly), so the commission base is the
        // booking total and the applied rate is snapshotted per line.
        const bookings = await this.db.booking.findMany({
            where: {
                paymentStatus: 'PAID',
                confirmedAt: { gte: periodStart, lt: periodEnd },
                session: { template: { agencyId } },
            },
            include: { session: { include: { template: { select: { title: true } } } } },
            orderBy: [{ confirmedAt: 'asc' }, { id: 'asc' }],
        });
        if (bookings.length === 0) {
            throw new BadRequestException('NO_BILLABLE_BOOKINGS_FOR_PERIOD');
        }

        const currency = bookings[0].currency || 'MAD';
        if (bookings.some((booking) => (booking.currency || 'MAD') !== currency)) {
            throw new BadRequestException('MIXED_BOOKING_CURRENCIES_FOR_PERIOD');
        }

        const lines = bookings.map((booking) => {
            const grossAmount = toMoneyDecimal(booking.totalAmount, 'totalAmount');
            const commissionAmount = grossAmount.mul(rate).div(100).toDecimalPlaces(2);
            return {
                bookingId: booking.id,
                description: booking.session.template.title,
                bookingDate: booking.confirmedAt ?? booking.bookingDate,
                grossAmount,
                commissionRate: rate,
                commissionAmount,
            };
        });
        const subtotalAmount = lines.reduce(
            (sum, line) => sum.add(line.grossAmount),
            new Prisma.Decimal(0),
        );
        const totalAmount = lines.reduce(
            (sum, line) => sum.add(line.commissionAmount),
            new Prisma.Decimal(0),
        );

        const issuer = this.getIssuerLegalDetails();
        const issuedYear = new Date().getUTCFullYear();

        try {
            const invoice = await this.db.$transaction(async (tx) => {
                const rows = await tx.$queryRaw<Array<{ lastValue: number }>>`
                    INSERT INTO "InvoiceSequence" ("year", "lastValue")
                    VALUES (${issuedYear}, 1)
                    ON CONFLICT ("year") DO UPDATE
                    SET "lastValue" = "InvoiceSequence"."lastValue" + 1
                    RETURNING "lastValue"
                `;
                const sequenceValue = rows[0]?.lastValue;
                if (!sequenceValue) {
                    throw new BadRequestException('INVOICE_SEQUENCE_UNAVAILABLE');
                }
                const number = `${INVOICE_NUMBER_PREFIX}-${issuedYear}-${String(sequenceValue).padStart(4, '0')}`;
                return tx.invoice.create({
                    data: {
                        number,
                        agencyId,
                        periodStart,
                        periodEnd,
                        currency,
                        commissionRate: rate,
                        subtotalAmount,
                        totalAmount,
                        issuerName: issuer.name,
                        issuerIce: issuer.ice,
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
                    where: { agencyId_periodStart_periodEnd: { agencyId, periodStart, periodEnd } },
                    include: { lineItems: { orderBy: { bookingDate: 'asc' } } },
                });
                if (winner) return serializeInvoice(winner);
            }
            throw error;
        }
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
