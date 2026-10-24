import { Controller, Get, UseGuards, Request, Patch, Body, Post, Query, Param, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';
import { DatabaseService } from '../database/database.service';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';
import { mapBookingDetails } from '../bookings/booking-response.util';
import { toMoneyString } from '../common/money.util';
import { UpdateAgencyProfileDto } from './dto/update-profile.dto';
import { getAgencyActivationBlock } from '../common/agency-licence.util';

const clampListLimit = (value?: string, fallback = 50, max = 200) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(Math.floor(parsed), 1), max);
};

const parsePage = (value?: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(Math.floor(parsed), 1);
};

@ApiTags('Agency')
@Controller('agency')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.Agency)
export class AgencyController {
    constructor(
        private readonly prisma: DatabaseService,
        private readonly externalPaymentsService: ExternalPaymentsService,
    ) { }

    @Post('subscription/cancel')
    @ApiOperation({ summary: 'Cancel the agency subscription at the end of the current period (#324)' })
    async cancelSubscription(@Request() req) {
        const agencyId = req.tenantId;
        const profile = await this.prisma.agencyProfile.findUnique({
            where: { id: agencyId },
            select: { subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true },
        });
        if (!profile) throw new NotFoundException('Agency profile not found');
        if (profile.subscriptionStatus !== 'TRIAL' && profile.subscriptionStatus !== 'ACTIVE') {
            throw new BadRequestException('Only a trial or active subscription can be cancelled');
        }
        const updated = await this.prisma.agencyProfile.update({
            where: { id: agencyId },
            data: { cancelAtPeriodEnd: true, cancellationRequestedAt: new Date() },
            select: { cancelAtPeriodEnd: true, cancellationRequestedAt: true, trialEndsAt: true, subscriptionEndsAt: true },
        });
        return {
            cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
            cancellationRequestedAt: updated.cancellationRequestedAt,
            // Access continues until this boundary; the SubscriptionGuard ends it there.
            effectiveAt: updated.subscriptionEndsAt ?? updated.trialEndsAt,
        };
    }

    @Post('subscription/resume')
    @ApiOperation({ summary: 'Undo a scheduled subscription cancellation (#324)' })
    async resumeSubscription(@Request() req) {
        const agencyId = req.tenantId;
        const profile = await this.prisma.agencyProfile.findUnique({
            where: { id: agencyId },
            select: { id: true },
        });
        if (!profile) throw new NotFoundException('Agency profile not found');
        const updated = await this.prisma.agencyProfile.update({
            where: { id: agencyId },
            data: { cancelAtPeriodEnd: false, cancellationRequestedAt: null },
            select: { cancelAtPeriodEnd: true },
        });
        return { cancelAtPeriodEnd: updated.cancelAtPeriodEnd };
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get agency dashboard stats' })
    async getStats(@Request() req) {
        const agencyId = req.tenantId;

        const [tripsCount, bookings, payments] = await Promise.all([
            this.prisma.tripTemplate.count({
                where: { agencyId, status: 'ACTIVE' },
            }),
            this.prisma.booking.groupBy({
                by: ['travelerId'],
                where: {
                    session: {
                        template: { agencyId }
                    },
                },
            }),
            this.externalPaymentsService.getAgencyPaymentsOverview(agencyId),
        ]);

        const [bookingCount, revenueAggregate] = await Promise.all([
            this.prisma.booking.count({
                where: {
                    session: { template: { agencyId } },
                },
            }),
            this.prisma.booking.aggregate({
                where: {
                    status: { in: ['CONFIRMED', 'COMPLETED'] },
                    session: { template: { agencyId } },
                },
                _sum: { totalAmount: true },
            }),
        ]);

        return {
            revenue: toMoneyString(revenueAggregate._sum.totalAmount) || '0.00',
            activeTrips: tripsCount,
            totalBookings: bookingCount,
            totalCustomers: bookings.length,
            // #368: payment facts about money held by the agency / its PSP.
            // There is no OuiBoo balance for traveller money anymore.
            payments,
        };
    }

    @Get('trips')
    @ApiOperation({ summary: 'Get agency trips' })
    async getTrips(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
        const agencyId = req.tenantId;
        const take = clampListLimit(limit);
        const currentPage = parsePage(page);
        const skip = (currentPage - 1) * take;
        const where = { agencyId };

        const [data, total] = await Promise.all([
            this.prisma.tripTemplate.findMany({
                where,
                include: {
                    sessions: {
                        include: {
                            _count: {
                                select: { bookings: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.tripTemplate.count({ where }),
        ]);

        return {
            data,
            pagination: {
                page: currentPage,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
            },
        };
    }

    @Get('trips/:id')
    @ApiOperation({ summary: 'Get one agency-owned trip' })
    async getTrip(@Request() req, @Param('id') id: string) {
        const trip = await this.prisma.tripTemplate.findFirst({
            where: { id, agencyId: req.tenantId },
            include: {
                sessions: {
                    include: {
                        _count: { select: { bookings: true } },
                    },
                    orderBy: { startDate: 'asc' },
                },
                itinerary: { orderBy: { dayNumber: 'asc' } },
            },
        });
        if (!trip) {
            throw new NotFoundException('Trip template not found');
        }
        return trip;
    }

    @Get('bookings')
    @ApiOperation({ summary: 'Get agency bookings' })
    async getBookings(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
        const agencyId = req.tenantId;
        const take = clampListLimit(limit);
        const currentPage = parsePage(page);
        const skip = (currentPage - 1) * take;

        const bookingsWhere = {
            session: {
                template: { agencyId }
            },
        };

        const [bookings, total] = await Promise.all([
            this.prisma.booking.findMany({
                where: bookingsWhere,
                include: {
                    session: {
                        include: {
                            template: {
                                include: {
                                    agency: true,
                                },
                            },
                        }
                    },
                    traveler: {
                        select: {
                            name: true,
                            email: true,
                        }
                    },
                    paymentProof: true
                },
                orderBy: {
                    bookingDate: 'desc'
                },
                skip,
                take,
            }),
            this.prisma.booking.count({ where: bookingsWhere }),
        ]);

        return {
            data: bookings.map(mapBookingDetails),
            pagination: {
                total,
                page: currentPage,
                limit: take,
                totalPages: Math.ceil(total / take),
            },
        };
    }
    @Get('payments/overview')
    @ApiOperation({ summary: 'Get agency payments overview (external payment facts, no OuiBoo balance)' })
    async getPaymentsOverview(@Request() req) {
        return this.externalPaymentsService.getAgencyPaymentsOverview(req.tenantId);
    }

    @Get('payments')
    @ApiOperation({ summary: 'List agency external payments (traveller payments held by the agency / its PSP)' })
    async getPayments(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
        return this.externalPaymentsService.listAgencyPayments(
            req.tenantId,
            parsePage(page),
            clampListLimit(limit, 20),
        );
    }

    @Get('reviews')
    @ApiOperation({ summary: 'Get agency reviews' })
    async getReviews(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
        const agencyId = req.tenantId;
        const take = clampListLimit(limit);
        const skip = (parsePage(page) - 1) * take;
        // #393: rating aggregates and lists count VISIBLE reviews only;
        // HIDDEN / REMOVED reviews are excluded everywhere.
        const where = {
            tripTemplate: { agencyId },
            status: 'VISIBLE' as const
        };

        const [reviews, aggregate, pendingResponses] = await Promise.all([
            this.prisma.review.findMany({
                where,
                include: {
                    traveler: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true
                        }
                    },
                    booking: {
                        include: {
                            session: {
                                include: {
                                    template: true
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.review.aggregate({
                where,
                _avg: { rating: true },
                _count: { _all: true },
            }),
            this.prisma.review.count({
                where: { ...where, response: null },
            }),
        ]);

        // Transform to match frontend expectations
        const transformedReviews = reviews.map(r => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            response: r.response,
            isVerifiedBooking: r.isVerifiedBooking,
            createdAt: r.createdAt,
            traveler: r.traveler,
            trip: {
                id: r.booking.session.template.id,
                title: r.booking.session.template.title
            }
        }));

        const totalReviews = aggregate._count._all;
        const averageRating = aggregate._avg.rating || 0;
        const respondedCount = totalReviews - pendingResponses;
        const responseRate = totalReviews > 0 ? Math.round((respondedCount / totalReviews) * 100) : 0;

        return {
            reviews: transformedReviews,
            stats: {
                totalReviews,
                averageRating: Number(averageRating.toFixed(1)),
                pendingResponses,
                responseRate
            }
        };
    }

    @Get('reviews/stats')
    @ApiOperation({ summary: 'Get agency review statistics' })
    async getReviewStats(@Request() req) {
        const agencyId = req.tenantId;
        // #393: VISIBLE reviews only (see getReviews above).
        const where = {
            tripTemplate: { agencyId },
            status: 'VISIBLE' as const
        };
        const [aggregate, pendingResponses] = await Promise.all([
            this.prisma.review.aggregate({
                where,
                _avg: { rating: true },
                _count: { _all: true },
            }),
            this.prisma.review.count({
                where: { ...where, response: null },
            }),
        ]);

        const totalReviews = aggregate._count._all;
        const averageRating = aggregate._avg.rating || 0;
        const respondedCount = totalReviews - pendingResponses;
        const responseRate = totalReviews > 0 ? Math.round((respondedCount / totalReviews) * 100) : 0;

        return {
            totalReviews,
            averageRating: Number(averageRating.toFixed(1)),
            pendingResponses,
            responseRate
        };
    }
    @Patch('profile') // Use Patch/Put, no ID param needed as we use req.user
    @ApiOperation({ summary: 'Update agency profile' })
    async updateProfile(@Request() req, @Body() data: UpdateAgencyProfileDto) {
        const existing = await this.prisma.agencyProfile.findUnique({
            where: { id: req.tenantId },
            select: {
                bankDetails: true,
                verificationStatus: true,
                travelLicenceStatus: true,
                licenceExpiry: true,
            },
        });
        if (!existing) throw new NotFoundException('Agency profile not found');
        const bankDetails = data.bankDetails?.trim();
        const bankDetailsChanged = data.bankDetails !== undefined
            && bankDetails !== (existing.bankDetails || '');

        // #371: setting payment instructions is payment activation. It
        // requires a verified identity AND a verified travel licence, so
        // no agency can start receiving traveller payments by bypassing
        // onboarding. Clearing the instructions (deactivation) stays open.
        if (bankDetailsChanged && bankDetails) {
            const block = getAgencyActivationBlock(existing);
            if (block) throw new ForbiddenException(block);
        }

        return this.prisma.agencyProfile.update({
            where: { id: req.tenantId },
            data: {
                companyName: data.companyName?.trim(),
                bio: data.bio?.trim(),
                logo: data.logo?.trim(),
                legalName: data.legalName?.trim(),
                rc: data.rc?.trim(),
                taxId: data.taxId?.trim(),
                legalRepresentative: data.legalRepresentative?.trim(),
                businessAddress: data.businessAddress?.trim(),
                bankDetails,
                verificationStatus: bankDetailsChanged && existing.verificationStatus === 'VERIFIED'
                    ? 'PENDING'
                    : undefined,
            }
        });
    }
}
