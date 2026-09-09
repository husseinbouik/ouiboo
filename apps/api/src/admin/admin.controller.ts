import { Controller, Get, Post, Body, Param, UseGuards, Patch, BadRequestException, Query, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
    type BookingStatusType,
    type PayoutStatusType,
    type SubscriptionStatusType,
    UserRole,
    VerificationStatus,
    type VerificationStatusType,
    SubscriptionStatus,
    BookingStatus,
    PayoutStatus,
} from '@ouiboo/types';
import { WalletsService } from '../wallets/wallets.service';
import { EmailService } from '../email/email.service';
import { AuditLogService } from './audit-log.service';
import { Response } from 'express';
import { mapBookingDetails } from '../bookings/booking-response.util';
import { mapPayoutDetails } from '../agency/payout-response.util';
import { PaymentsService } from '../payments/payments.service';
import { type MoneyInput } from '../common/money.util';

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

const VERIFICATION_STATUSES = Object.values(VerificationStatus) as VerificationStatusType[];
const SUBSCRIPTION_STATUSES = Object.values(SubscriptionStatus) as SubscriptionStatusType[];
const BOOKING_STATUSES = Object.values(BookingStatus) as BookingStatusType[];
const PAYOUT_STATUSES = Object.values(PayoutStatus) as PayoutStatusType[];

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@ApiBearerAuth()
export class AdminController {
    constructor(
        private db: DatabaseService,
        private walletsService: WalletsService,
        private emailService: EmailService,
        private auditLogService: AuditLogService,
        private paymentsService: PaymentsService,
    ) { }

    @Get('pending-payments')
    @ApiOperation({ summary: 'Get payment proofs pending verification' })
    async getPendingPayments(@Query('q') q?: string) {
        const search = q?.trim();
        const proofs = await this.db.paymentProof.findMany({
            where: {
                status: 'PENDING',
                ...(search ? {
                    OR: [
                        { booking: { id: { contains: search, mode: 'insensitive' } } },
                        { booking: { traveler: { name: { contains: search, mode: 'insensitive' } } } },
                        { booking: { traveler: { email: { contains: search, mode: 'insensitive' } } } },
                        { booking: { session: { template: { title: { contains: search, mode: 'insensitive' } } } } },
                    ],
                } : {}),
            },
            include: { booking: { include: { traveler: true, session: { include: { template: true } } } } }
        });
        const apiUrl = (process.env.API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');

        return proofs.map((proof) => ({
            ...proof,
            booking: mapBookingDetails(proof.booking),
            downloadUrl: `${apiUrl}/bookings/${proof.bookingId}/payment-proof/download`,
        }));
    }

    @Post('payments/:id/verify')
    @ApiOperation({ summary: 'Approve or reject payment proof' })
    async verifyPayment(
        @Request() req,
        @Param('id') id: string,
        @Body('status') status: 'VERIFIED' | 'REJECTED',
        @Body('rejectionReason') rejectionReason?: string
    ) {
        if (!['VERIFIED', 'REJECTED'].includes(status)) {
            throw new BadRequestException('Invalid payment proof status');
        }
        if (status === 'REJECTED' && !rejectionReason) {
            throw new BadRequestException('Rejection reason is required when rejecting a payment');
        }

        const result = await this.db.$transaction(async (tx) => {
            const proof = await tx.paymentProof.findUnique({
                where: { id },
                include: { booking: { include: { session: { include: { template: true } }, traveler: true } } }
            });

            if (!proof) {
                throw new BadRequestException('Payment proof not found');
            }

            if (proof.status !== 'PENDING') {
                throw new BadRequestException('Payment proof has already been reviewed');
            }

            if (proof.booking.status !== 'AWAITING_VALIDATION') {
                throw new BadRequestException('Booking is not awaiting payment validation');
            }

            const updatedProof = await tx.paymentProof.update({
                where: { id },
                data: {
                    status,
                    rejectionReason: status === 'REJECTED' ? rejectionReason : null,
                }
            });

            const updatedBooking = await tx.booking.update({
                where: { id: proof.bookingId },
                data: {
                    status: status === 'VERIFIED' ? 'CONFIRMED' : 'REJECTED',
                    paymentStatus: status === 'VERIFIED' ? 'PAID' : 'FAILED',
                    confirmedAt: status === 'VERIFIED' ? new Date() : null,
                },
                include: { session: { include: { template: true } } }
            });

            if (status === 'VERIFIED') {
                await this.walletsService.creditWalletInTransaction(
                    tx,
                    updatedBooking.session.template.agencyId,
                    updatedBooking.totalAmount,
                    `Booking #${updatedBooking.id} confirmed`,
                    {
                        idempotencyKey: `booking:${updatedBooking.id}:payment-credit`,
                        referenceId: updatedBooking.id,
                        type: 'BOOKING',
                    },
                );
            }

            return {
                updatedProof,
                bookingId: proof.bookingId,
                travelerEmail: proof.booking.traveler?.email,
                tripTitle: updatedBooking.session.template.title,
            };
        });

        if (status === 'VERIFIED' && result.travelerEmail) {
            this.emailService.sendPaymentConfirmation(
                result.travelerEmail,
                result.tripTitle,
            ).catch((err) => console.error('Failed to send payment confirmation email', err));
        }

        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'PAYMENT_PROOF_VERIFIED',
            targetType: 'PaymentProof',
            targetId: result.updatedProof.id,
            metadata: {
                status,
                bookingId: result.bookingId,
            },
        }).catch((err) => console.error('Audit log failed', err));

        return result.updatedProof;
    }

    @Get('overview-counts')
    @ApiOperation({ summary: 'Get lightweight counts for the admin dashboard' })
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
            pendingPayouts,
            auditLogs,
        ] = await Promise.all([
            this.db.agencyProfile.count({ where: { verificationStatus: 'PENDING' } }),
            this.db.tripTemplate.count({ where: { status: 'DRAFT' } }),
            this.db.agencyProfile.count(),
            this.db.booking.count(),
            this.db.booking.count({ where: { bookingDate: { gte: startOfToday } } }),
            this.db.paymentProof.count({ where: { status: 'PENDING' } }),
            this.db.payoutRequest.count({ where: { status: 'PENDING' } }),
            this.db.auditLog.count(),
        ]);

        return {
            pendingAgencies,
            pendingTrips,
            agencies,
            bookings,
            bookingsToday,
            pendingPaymentProofs,
            pendingPayouts,
            auditLogs,
        };
    }

    @Get('pending-agencies')
    @ApiOperation({ summary: 'Get agencies pending verification' })
    getPendingAgencies(@Query('q') q?: string) {
        const search = q?.trim();
        return this.db.agencyProfile.findMany({
            where: {
                verificationStatus: 'PENDING',
                ...(search ? {
                    OR: [
                        { companyName: { contains: search, mode: 'insensitive' } },
                        { ice: { contains: search, mode: 'insensitive' } },
                        { user: { email: { contains: search, mode: 'insensitive' } } },
                        { user: { name: { contains: search, mode: 'insensitive' } } },
                    ],
                } : {}),
            },
            include: { user: true }
        });
    }

    @Post('agencies/:id/verify')
    @ApiOperation({ summary: 'Approve or reject agency' })
    async verifyAgency(@Request() req, @Param('id') id: string, @Body('status') status: 'VERIFIED' | 'REJECTED') {
        if (!['VERIFIED', 'REJECTED'].includes(status)) {
            throw new BadRequestException('Invalid agency verification status');
        }
        const updated = await this.db.agencyProfile.update({
            where: { id },
            data: { verificationStatus: status }
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'AGENCY_VERIFIED',
            targetType: 'AgencyProfile',
            targetId: id,
            metadata: { status },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }

    @Get('pending-trips')
    @ApiOperation({ summary: 'Get trips pending verification' })
    getPendingTrips(@Query('q') q?: string) {
        const search = q?.trim();
        return this.db.tripTemplate.findMany({
            where: {
                status: 'DRAFT',
                ...(search ? {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { agency: { companyName: { contains: search, mode: 'insensitive' } } },
                    ],
                } : {}),
            }, // Assuming Draft is what they start as
            include: { agency: true }
        });
    }

    @Post('trips/:id/verify')
    @ApiOperation({ summary: 'Approve or reject trip' })
    async verifyTrip(@Request() req, @Param('id') id: string, @Body('status') status: 'ACTIVE' | 'ARCHIVED') {
        if (!['ACTIVE', 'ARCHIVED'].includes(status)) {
            throw new BadRequestException('Invalid trip status');
        }
        const trip = await this.db.tripTemplate.findUnique({
            where: { id },
            include: { agency: true },
        });
        if (!trip) throw new BadRequestException('Trip not found');
        if (status === 'ACTIVE') {
            const now = new Date();
            const subscriptionValid = trip.agency.subscriptionStatus === 'ACTIVE'
                ? !trip.agency.subscriptionEndsAt || trip.agency.subscriptionEndsAt > now
                : trip.agency.subscriptionStatus === 'TRIAL'
                    && !!trip.agency.trialEndsAt
                    && trip.agency.trialEndsAt > now;
            if (trip.agency.verificationStatus !== 'VERIFIED' || !subscriptionValid) {
                throw new BadRequestException('Agency must be verified with an active subscription or trial');
            }
        }
        const updated = await this.db.tripTemplate.update({
            where: { id },
            data: { status: status }
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'TRIP_VERIFIED',
            targetType: 'TripTemplate',
            targetId: id,
            metadata: { status },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }

    @Get('agencies')
    @ApiOperation({ summary: 'Get all agencies' })
    getAgencies(
        @Query('q') q?: string,
        @Query('verificationStatus') verificationStatus?: string,
        @Query('subscriptionStatus') subscriptionStatus?: string,
    ) {
        const search = q?.trim();
        const verificationFilter = parseEnumQuery(verificationStatus, VERIFICATION_STATUSES);
        const subscriptionFilter = parseEnumQuery(subscriptionStatus, SUBSCRIPTION_STATUSES);
        return this.db.agencyProfile.findMany({
            where: {
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
            },
            include: { user: true },
        });
    }

    @Patch('agencies/:id/status')
    @ApiOperation({ summary: 'Update agency verification or subscription status' })
    async updateAgencyStatus(
        @Request() req,
        @Param('id') id: string,
        @Body() data: { verificationStatus?: VerificationStatusType; subscriptionStatus?: SubscriptionStatusType },
    ) {
        if (!data.verificationStatus && !data.subscriptionStatus) {
            throw new BadRequestException('At least one agency status is required');
        }
        if (data.verificationStatus && !VERIFICATION_STATUSES.includes(data.verificationStatus)) {
            throw new BadRequestException('Invalid agency verification status');
        }
        if (data.subscriptionStatus && !SUBSCRIPTION_STATUSES.includes(data.subscriptionStatus)) {
            throw new BadRequestException('Invalid agency subscription status');
        }
        const updated = await this.db.agencyProfile.update({
            where: { id },
            data: {
                verificationStatus: data.verificationStatus,
                subscriptionStatus: data.subscriptionStatus
            }
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'AGENCY_STATUS_UPDATED',
            targetType: 'AgencyProfile',
            targetId: id,
            metadata: {
                verificationStatus: data.verificationStatus,
                subscriptionStatus: data.subscriptionStatus,
            },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }

    @Get('bookings')
    @ApiOperation({ summary: 'Get all bookings in the system' })
    async getBookings(@Query('q') q?: string, @Query('status') status?: string) {
        const search = q?.trim();
        const statusFilter = parseEnumQuery(status, BOOKING_STATUSES);
        const bookings = await this.db.booking.findMany({
            where: {
                ...(statusFilter ? { status: statusFilter } : {}),
                ...(search ? {
                    OR: [
                        { id: { contains: search, mode: 'insensitive' } },
                        { traveler: { name: { contains: search, mode: 'insensitive' } } },
                        { traveler: { email: { contains: search, mode: 'insensitive' } } },
                        { session: { template: { title: { contains: search, mode: 'insensitive' } } } },
                    ],
                } : {}),
            },
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
                paymentProof: true
            },
            orderBy: { bookingDate: 'desc' }
        });

        return bookings.map(mapBookingDetails);
    }

    @Post('bookings/:id/refund')
    @ApiOperation({ summary: 'Refund a paid gateway booking' })
    async refundBooking(
        @Request() req,
        @Param('id') id: string,
        @Body('amount') amount?: MoneyInput,
    ) {
        const result = await this.paymentsService.refundBookingById(id, amount);

        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'BOOKING_REFUNDED',
            targetType: 'Booking',
            targetId: id,
            metadata: {
                amount,
                result,
            },
        }).catch((err) => console.error('Audit log failed', err));

        return result;
    }

    @Get('payout-requests')
    @ApiOperation({ summary: 'Get all payout requests' })
    async getPayoutRequests(@Query('q') q?: string, @Query('status') status?: string) {
        const search = q?.trim();
        const statusFilter = parseEnumQuery(status, PAYOUT_STATUSES);
        const payouts = await this.db.payoutRequest.findMany({
            where: {
                ...(statusFilter ? { status: statusFilter } : {}),
                ...(search ? {
                    OR: [
                        { id: { contains: search, mode: 'insensitive' } },
                        { agency: { companyName: { contains: search, mode: 'insensitive' } } },
                        { agency: { user: { email: { contains: search, mode: 'insensitive' } } } },
                    ],
                } : {}),
            },
            include: { agency: { include: { user: true } } }
        });

        return payouts.map(mapPayoutDetails);
    }

    @Post('payouts/:id/process')
    @ApiOperation({ summary: 'Mark payout as paid or rejected' })
    async processPayout(@Request() req, @Param('id') id: string, @Body('status') status: 'PAID' | 'REJECTED') {
        if (!['PAID', 'REJECTED'].includes(status)) {
            throw new BadRequestException('Invalid payout status');
        }
        const updated = await this.db.$transaction(async (tx) => {
            const payout = await tx.payoutRequest.findUnique({
                where: { id },
                include: {
                    agency: {
                        include: {
                            wallet: true,
                        },
                    },
                },
            });

            if (!payout) {
                throw new BadRequestException('Payout request not found');
            }

            if (payout.status !== PayoutStatus.Pending) {
                throw new BadRequestException('Payout request has already been processed');
            }

            const claimed = await tx.payoutRequest.updateMany({
                where: { id, status: PayoutStatus.Pending },
                data: {
                    status,
                    processedAt: new Date(),
                },
            });
            if (claimed.count !== 1) {
                throw new BadRequestException('Payout request has already been processed');
            }

            const processedPayout = await tx.payoutRequest.findUniqueOrThrow({ where: { id } });

            if (status === 'REJECTED') {
                await this.walletsService.creditWalletInTransaction(
                    tx,
                    payout.agencyId,
                    payout.amount,
                    `Payout request ${payout.id} rejected and funds restored`,
                    {
                        idempotencyKey: `payout:${payout.id}:rejection-credit`,
                        referenceId: payout.id,
                        type: 'CREDIT',
                    },
                );
            }

            return processedPayout;
        });
        this.auditLogService.log({
            actorId: req?.user?.userId,
            actorEmail: req?.user?.email,
            action: 'PAYOUT_PROCESSED',
            targetType: 'PayoutRequest',
            targetId: id,
            metadata: { status },
        }).catch((err) => console.error('Audit log failed', err));
        return updated;
    }

    @Get('audit-logs')
    @ApiOperation({ summary: 'List audit logs with optional filters' })
    async getAuditLogs(
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
        const take = clampNumber(Number.isFinite(parsedLimit) ? parsedLimit : 100, 1, 200);
        const where = buildAuditLogWhere({
            fromDate,
            toDate,
            action: action?.trim(),
            actorEmail: actorEmail?.trim(),
            targetType: targetType?.trim(),
            search: q?.trim(),
        });

        return this.db.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take,
        });
    }

    @Get('audit-logs/export')
    @ApiOperation({ summary: 'Export audit logs as CSV' })
    async exportAuditLogs(
        @Request() req,
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
        const take = clampNumber(Number.isFinite(parsedLimit) ? parsedLimit : 1000, 1, 5000);
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

    @Post('audit-logs/retention')
    @ApiOperation({ summary: 'Prune audit logs older than a retention window' })
    async pruneAuditLogs(
        @Request() req,
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
