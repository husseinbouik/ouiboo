import { Injectable } from '@nestjs/common';
import { Controller, Get, Post, Body, Param, UseGuards, Patch, BadRequestException, Query, Request, Res } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
    type BookingStatusType,
    type SubscriptionStatusType,
    UserRole,
    VerificationStatus,
    type VerificationStatusType,
    SubscriptionStatus,
    BookingStatus,
} from '@ouiboo/types';
import { PaymentCustodian, PaymentLedgerSource, PaymentMethod, Prisma } from '@ouiboo/database';
import { AuditLogService } from './audit-log.service';
import { Response } from 'express';
import {
    BANK_CONFIRMATION_EXTERNAL_PAYMENT_SELECT,
    mapBookingDetails,
    resolveBankConfirmation,
} from '../bookings/booking-response.util';
import { serializeDuplicateCreditFlag } from '../bookings/bookings.service';
import { effectiveInsuranceStatus, effectiveLicenceStatus, getAgencyActivationBlock, sellerBlockMissingFields } from '../common/agency-licence.util';
import { derivePublicMediaUrl } from '../upload/media-url.util';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

const parseEnumQuery = <T extends string>(value: string | undefined, allowedValues: readonly T[]) => {
    if (!value) {
        return undefined;
    }
    const normalized = value.trim().toUpperCase() as T;
    return allowedValues.includes(normalized) ? normalized : undefined;
};

const parseDateQuery = (value?: string) => {
    if (!value) {
        return undefined;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const parsePaginationQuery = (
    pageValue?: string,
    limitValue?: string,
    defaultLimit = 25,
    maxLimit = 100,
) => {
    const parsedLimit = Number(limitValue);
    const limit = clampNumber(Number.isFinite(parsedLimit) ? Math.floor(parsedLimit) : defaultLimit, 1, maxLimit);
    const parsedPage = Number(pageValue);
    const page = clampNumber(Number.isFinite(parsedPage) ? Math.floor(parsedPage) : 1, 1, 1_000_000);
    return { page, limit };
};

const buildPaginationMeta = (total: number, page: number, limit: number) => ({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
});

const buildAuditLogWhere = ({
    fromDate,
    toDate,
    action,
    actorEmail,
    targetType,
    search,
}: {
    fromDate?: Date;
    toDate?: Date;
    action?: string;
    actorEmail?: string;
    targetType?: string;
    search?: string;
}) => {
    const where: Record<string, any> = {};
    if (fromDate || toDate) {
        where.createdAt = {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
        };
    }
    if (action) {
        where.action = action;
    }
    if (actorEmail) {
        where.actorEmail = { contains: actorEmail, mode: 'insensitive' };
    }
    if (targetType) {
        where.targetType = targetType;
    }
    if (search) {
        where.OR = [
            { action: { contains: search, mode: 'insensitive' } },
            { actorEmail: { contains: search, mode: 'insensitive' } },
            { targetType: { contains: search, mode: 'insensitive' } },
            { targetId: { contains: search, mode: 'insensitive' } },
        ];
    }
    return where;
};

const escapeCsvValue = (value: unknown) => {
    if (value === null || value === undefined) {
        return '';
    }
    const stringValue = String(value);
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};

export const VERIFICATION_STATUSES = Object.values(VerificationStatus) as VerificationStatusType[];

export const SUBSCRIPTION_STATUSES = Object.values(SubscriptionStatus) as SubscriptionStatusType[];

const BOOKING_STATUSES = Object.values(BookingStatus) as BookingStatusType[];

@Injectable()
export class AdminQueryService {
    constructor(
        private readonly db: DatabaseService,
        private readonly auditLogService: AuditLogService,
    ) { }

    async getPendingPayments(
        @Query('q') q?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const search = q?.trim();
        const { page: safePage, limit: safeLimit } = parsePaginationQuery(page, limit);
        // #422 (Council P0-20): ACCEPTED proofs stay listed alongside
        // PENDING ones — acceptance is not settlement, and the Payment
        // Proofs tab must show the proof as awaiting the agency's bank
        // confirmation until that confirmation flips it to VERIFIED.
        const where: Prisma.PaymentProofWhereInput = {
            status: { in: ['PENDING', 'ACCEPTED'] },
            ...(search ? {
                OR: [
                    { booking: { id: { contains: search, mode: 'insensitive' } } },
                    { booking: { traveler: { name: { contains: search, mode: 'insensitive' } } } },
                    { booking: { traveler: { email: { contains: search, mode: 'insensitive' } } } },
                    { booking: { session: { template: { title: { contains: search, mode: 'insensitive' } } } } },
                ],
            } : {}),
        };
        const [proofs, total] = await Promise.all([
            this.db.paymentProof.findMany({
                where,
                include: {
                    booking: {
                        include: {
                            traveler: { select: { email: true, name: true } },
                            session: { include: { template: true } },
                            paymentProof: true,
                            paymentPlan: true,
                            externalPayments: { select: BANK_CONFIRMATION_EXTERNAL_PAYMENT_SELECT },
                        },
                    },
                },
                orderBy: { uploadedAt: 'desc' },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            this.db.paymentProof.count({ where }),
        ]);
        const apiUrl = (process.env.API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');

        const data = proofs.map((proof) => ({
            ...proof,
            booking: mapBookingDetails(proof.booking),
            // #422: the stage ExternalPayment's bank confirmation, in the
            // AdminPaymentProof.bankConfirmation shape the tab renders
            // read-only (null until the agency confirms the bank credit).
            bankConfirmation: resolveBankConfirmation(proof.booking),
            downloadUrl: `${apiUrl}/bookings/${proof.bookingId}/payment-proof/download`,
        }));
        return { data, pagination: buildPaginationMeta(total, safePage, safeLimit) };
    }

    async getOverviewCounts() {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const [
            pendingAgencies,
            pendingTrips,
            agencies,
            bookings,
            bookingsToday,
            pendingPaymentProofs,
            auditLogs,
        ] = await Promise.all([
            this.db.agencyProfile.count({ where: { verificationStatus: 'PENDING' } }),
            this.db.tripTemplate.count({ where: { status: 'DRAFT' } }),
            this.db.agencyProfile.count(),
            this.db.booking.count(),
            this.db.booking.count({ where: { bookingDate: { gte: startOfToday } } }),
            this.db.paymentProof.count({ where: { status: 'PENDING' } }),
            this.db.auditLog.count(),
        ]);

        return {
            pendingAgencies,
            pendingTrips,
            agencies,
            bookings,
            bookingsToday,
            pendingPaymentProofs,
            auditLogs,
        };
    }

    async getPendingAgencies(
        @Query('q') q?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const search = q?.trim();
        const { page: safePage, limit: safeLimit } = parsePaginationQuery(page, limit);
        const where: Prisma.AgencyProfileWhereInput = {
            verificationStatus: 'PENDING',
            ...(search ? {
                OR: [
                    { companyName: { contains: search, mode: 'insensitive' } },
                    { ice: { contains: search, mode: 'insensitive' } },
                    { user: { email: { contains: search, mode: 'insensitive' } } },
                    { user: { name: { contains: search, mode: 'insensitive' } } },
                ],
            } : {}),
        };
        const [agencies, total] = await Promise.all([
            this.db.agencyProfile.findMany({
                where,
                include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true, isEmailVerified: true } } },
                orderBy: { id: 'asc' },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            this.db.agencyProfile.count({ where }),
        ]);
        // #371: surface the derived licence status so an expired licence is
        // flagged in admin even when the stored value still says VERIFIED.
        // #415: same for the RC insurance artefact.
        return {
            data: agencies.map((agency) => ({
                ...agency,
                // #447: the agency logo and the owner avatar are stored
                // file references — re-derive them against the current
                // public media base at read time.
                logo: derivePublicMediaUrl(agency.logo) ?? null,
                user: agency.user
                    ? { ...agency.user, avatar: derivePublicMediaUrl(agency.user.avatar) }
                    : agency.user,
                effectiveLicenceStatus: effectiveLicenceStatus(agency),
                effectiveInsuranceStatus: effectiveInsuranceStatus(agency),
            })),
            pagination: buildPaginationMeta(total, safePage, safeLimit),
        };
    }

    // #494 (B16): duplicate-credit reconciliation queue — agencies
    // flag second bank credits (invisible to the ledger); admin
    // reconciles manually and closes flags here. Ops record only.
    async listDuplicateCreditFlags() {
        const flags = await this.db.duplicateCreditFlag.findMany({
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        // OPEN first (stable sort keeps the newest-first order inside
        // each status group) so the queue reads as a work list.
        const sorted = [...flags].sort((a, b) => Number(b.status === 'OPEN') - Number(a.status === 'OPEN'));
        return sorted.map(serializeDuplicateCreditFlag);
    }

    async getPendingTrips(
        @Query('q') q?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const search = q?.trim();
        const { page: safePage, limit: safeLimit } = parsePaginationQuery(page, limit);
        const where: Prisma.TripTemplateWhereInput = {
            status: 'DRAFT',
            ...(search ? {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { agency: { companyName: { contains: search, mode: 'insensitive' } } },
                ],
            } : {}),
        }; // Assuming Draft is what they start as
        const [trips, total] = await Promise.all([
            this.db.tripTemplate.findMany({
                where,
                include: { agency: true },
                orderBy: { createdAt: 'desc' },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            this.db.tripTemplate.count({ where }),
        ]);
        return { data: trips, pagination: buildPaginationMeta(total, safePage, safeLimit) };
    }

    async getAgencies(
        @Query('q') q?: string,
        @Query('verificationStatus') verificationStatus?: string,
        @Query('subscriptionStatus') subscriptionStatus?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const search = q?.trim();
        const verificationFilter = parseEnumQuery(verificationStatus, VERIFICATION_STATUSES);
        const subscriptionFilter = parseEnumQuery(subscriptionStatus, SUBSCRIPTION_STATUSES);
        const { page: safePage, limit: safeLimit } = parsePaginationQuery(page, limit);
        const where: Prisma.AgencyProfileWhereInput = {
            ...(verificationFilter ? { verificationStatus: verificationFilter } : {}),
            ...(subscriptionFilter ? { subscriptionStatus: subscriptionFilter } : {}),
            ...(search ? {
                OR: [
                    { companyName: { contains: search, mode: 'insensitive' } },
                    { ice: { contains: search, mode: 'insensitive' } },
                    { user: { email: { contains: search, mode: 'insensitive' } } },
                    { user: { name: { contains: search, mode: 'insensitive' } } },
                ],
            } : {}),
        };
        const [agencies, total] = await Promise.all([
            this.db.agencyProfile.findMany({
                where,
                include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true, isEmailVerified: true } } },
                orderBy: { id: 'asc' },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            this.db.agencyProfile.count({ where }),
        ]);
        // #371: derived licence status (expired licences flagged on read).
        // #415: derived insurance status alongside it.
        // B4: seller-block data completeness — for an effectively
        // VERIFIED licence, the Law 31-08 block fields still missing on
        // the record (legacy rows predate licenceIssuedAt /
        // licenceIssuingAuthority). Admin works this list until every
        // verified agency has supplied them; other rows report [].
        return {
            data: agencies.map((agency) => ({
                ...agency,
                // #447: the agency logo and the owner avatar are stored
                // file references — re-derive them against the current
                // public media base at read time.
                logo: derivePublicMediaUrl(agency.logo) ?? null,
                user: agency.user
                    ? { ...agency.user, avatar: derivePublicMediaUrl(agency.user.avatar) }
                    : agency.user,
                effectiveLicenceStatus: effectiveLicenceStatus(agency),
                effectiveInsuranceStatus: effectiveInsuranceStatus(agency),
                sellerBlockMissingFields: effectiveLicenceStatus(agency) === 'VERIFIED'
                    ? sellerBlockMissingFields(agency)
                    : [],
            })),
            pagination: buildPaginationMeta(total, safePage, safeLimit),
        };
    }

    async getBookings(
        @Query('q') q?: string,
        @Query('status') status?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const search = q?.trim();
        const statusFilter = parseEnumQuery(status, BOOKING_STATUSES);
        const { page: safePage, limit: safeLimit } = parsePaginationQuery(page, limit);
        const where: Prisma.BookingWhereInput = {
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(search ? {
                OR: [
                    { id: { contains: search, mode: 'insensitive' } },
                    { traveler: { name: { contains: search, mode: 'insensitive' } } },
                    { traveler: { email: { contains: search, mode: 'insensitive' } } },
                    { session: { template: { title: { contains: search, mode: 'insensitive' } } } },
                ],
            } : {}),
        };
        const [bookings, total] = await Promise.all([
            this.db.booking.findMany({
                where,
                include: {
                    traveler: {
                        select: {
                            email: true,
                            name: true,
                        },
                    },
                    session: {
                        include: {
                            template: {
                                include: {
                                    agency: true,
                                },
                            },
                        },
                    },
                    paymentProof: true,
                    // #422: mapBookingDetails reads the plan status and
                    // the stage ExternalPayments to embed the proof's
                    // bank-confirmation state in the Bookings tab rows.
                    paymentPlan: true,
                    externalPayments: { select: BANK_CONFIRMATION_EXTERNAL_PAYMENT_SELECT },
                },
                orderBy: { bookingDate: 'desc' },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            this.db.booking.count({ where }),
        ]);

        return {
            data: bookings.map((booking) => mapBookingDetails(booking)),
            pagination: buildPaginationMeta(total, safePage, safeLimit),
        };
    }

    async getAuditLogs(
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('action') action?: string,
        @Query('actorEmail') actorEmail?: string,
        @Query('targetType') targetType?: string,
        @Query('q') q?: string,
        @Query('limit') limit?: string,
        @Query('page') page?: string,
    ) {
        const fromDate = parseDateQuery(from);
        const toDate = parseDateQuery(to);
        const { page: safePage, limit: safeLimit } = parsePaginationQuery(page, limit, 100, 200);
        const where = buildAuditLogWhere({
            fromDate,
            toDate,
            action: action?.trim(),
            actorEmail: actorEmail?.trim(),
            targetType: targetType?.trim(),
            search: q?.trim(),
        });

        const [logs, total] = await Promise.all([
            this.db.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (safePage - 1) * safeLimit,
                take: safeLimit,
            }),
            this.db.auditLog.count({ where }),
        ]);

        return { data: logs, pagination: buildPaginationMeta(total, safePage, safeLimit) };
    }

    async exportAuditLogs(
        @Request() req: AuthenticatedRequest,
        @Res() res: Response,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('action') action?: string,
        @Query('actorEmail') actorEmail?: string,
        @Query('targetType') targetType?: string,
        @Query('q') q?: string,
        @Query('limit') limit?: string,
    ) {
        const fromDate = parseDateQuery(from);
        const toDate = parseDateQuery(to);
        const parsedLimit = Number(limit);
        const take = clampNumber(Number.isFinite(parsedLimit) ? Math.floor(parsedLimit) : 1000, 1, 5000);
        const where = buildAuditLogWhere({
            fromDate,
            toDate,
            action: action?.trim(),
            actorEmail: actorEmail?.trim(),
            targetType: targetType?.trim(),
            search: q?.trim(),
        });
        const logs = await this.db.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take,
        });

        const header = ['id', 'createdAt', 'actorId', 'actorEmail', 'action', 'targetType', 'targetId', 'metadata'];
        const rows = logs.map((log) => [
            log.id,
            log.createdAt.toISOString(),
            log.actorId || '',
            log.actorEmail || '',
            log.action,
            log.targetType,
            log.targetId || '',
            log.metadata ? JSON.stringify(log.metadata) : '',
        ]);
        const csv = [header.join(','), ...rows.map((row) => row.map(escapeCsvValue).join(','))].join('\n');

        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'AUDIT_LOG_EXPORTED',
            targetType: 'AuditLog',
            metadata: {
                from,
                to,
                action,
                actorEmail,
                targetType,
                q,
                count: logs.length,
            },
        }).catch((err) => console.error('Audit log failed', err));

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
        return res.send(csv);
    }

    async pruneAuditLogs(
        @Request() req: AuthenticatedRequest,
        @Body('days') days?: number,
    ) {
        const parsedDays = Number(days ?? process.env.AUDIT_LOG_RETENTION_DAYS);
        if (!Number.isFinite(parsedDays) || parsedDays < 1) {
            throw new BadRequestException('Retention days must be a positive number.');
        }
        const cutoff = new Date(Date.now() - parsedDays * 24 * 60 * 60 * 1000);
        const result = await this.db.auditLog.deleteMany({
            where: {
                createdAt: { lt: cutoff },
            },
        });

        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'AUDIT_LOG_PRUNED',
            targetType: 'AuditLog',
            metadata: {
                retentionDays: parsedDays,
                deleted: result.count,
                cutoff: cutoff.toISOString(),
            },
        }).catch((err) => console.error('Audit log failed', err));

        return {
            deleted: result.count,
            cutoff,
        };
    }
}
