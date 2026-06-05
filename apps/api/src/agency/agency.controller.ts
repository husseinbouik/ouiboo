import { Controller, Get, UseGuards, Request, Patch, Body, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';
import { DatabaseService } from '../database/database.service';
import { WalletsService } from '../wallets/wallets.service';
import { RequestPayoutDto } from './dto/payout-request.dto';
import { mapBookingDetails } from '../bookings/booking-response.util';
import { mapPayoutDetails } from './payout-response.util';

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
        private readonly walletsService: WalletsService,
    ) { }

    @Get('stats')
    @ApiOperation({ summary: 'Get agency dashboard stats' })
    async getStats(@Request() req) {
        const agencyId = req.tenantId;

        const [tripsCount, bookings, wallet] = await Promise.all([
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
            this.prisma.wallet.findUnique({
                where: { agencyId }
            })
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
            revenue: revenueAggregate._sum.totalAmount || 0,
            activeTrips: tripsCount,
            totalBookings: bookingCount,
            totalCustomers: bookings.length,
            wallet: wallet || { availableBalance: 0, pendingBalance: 0 }
        };
    }

    @Get('trips')
    @ApiOperation({ summary: 'Get agency trips' })
    async getTrips(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
        const agencyId = req.tenantId;
        const take = clampListLimit(limit);
        const skip = (parsePage(page) - 1) * take;

        return this.prisma.tripTemplate.findMany({
            where: { agencyId },
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
        });
    }

    @Get('bookings')
    @ApiOperation({ summary: 'Get agency bookings' })
    async getBookings(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
        const agencyId = req.tenantId;
        const take = clampListLimit(limit);
        const skip = (parsePage(page) - 1) * take;

        const bookings = await this.prisma.booking.findMany({
            where: {
                session: {
                    template: { agencyId }
                },
            },
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
        });

        return bookings.map(mapBookingDetails);
    }
    @Get('payouts')
    @ApiOperation({ summary: 'Get agency payout history' })
    async getPayouts(@Request() req) {
        const agencyId = req.tenantId;

        const payouts = await this.prisma.payoutRequest.findMany({
            where: { agencyId },
            include: {
                agency: {
                    include: {
                        user: {
                            select: {
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: { requestedAt: 'desc' },
            take: 20
        });

        return payouts.map(mapPayoutDetails);
    }
    @Get('reviews')
    @ApiOperation({ summary: 'Get agency reviews' })
    async getReviews(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
        const agencyId = req.tenantId;
        const take = clampListLimit(limit);
        const skip = (parsePage(page) - 1) * take;

        const reviews = await this.prisma.review.findMany({
            where: {
                booking: {
                    session: {
                        template: { agencyId }
                    }
                }
            },
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
        });

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

        // Calculate stats
        const totalReviews = transformedReviews.length;
        const averageRating = totalReviews > 0
            ? transformedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            : 0;
        const pendingResponses = transformedReviews.filter(r => !r.response).length;
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

        const reviews = await this.prisma.review.findMany({
            where: {
                booking: {
                    session: {
                        template: { agencyId }
                    }
                }
            },
            select: {
                rating: true,
                response: true
            }
        });

        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            : 0;
        const pendingResponses = reviews.filter(r => !r.response).length;
        const respondedCount = totalReviews - pendingResponses;
        const responseRate = totalReviews > 0 ? Math.round((respondedCount / totalReviews) * 100) : 0;

        return {
            totalReviews,
            averageRating: Number(averageRating.toFixed(1)),
            pendingResponses,
            responseRate
        };
    }
    @Post('payouts')
    @ApiOperation({ summary: 'Request a payout' })
    async requestPayout(@Request() req, @Body() dto: RequestPayoutDto) {
        return this.walletsService.requestPayout(req.tenantId, dto.amount, dto.bankDetails);
    }

    @Patch('profile') // Use Patch/Put, no ID param needed as we use req.user
    @ApiOperation({ summary: 'Update agency profile' })
    async updateProfile(@Request() req, @Body() data: { companyName?: string; bio?: string; logo?: string; bankDetails?: string; }) {
        // Validation could be added here or via DTO
        return this.prisma.agencyProfile.update({
            where: { id: req.tenantId },
            data: {
                companyName: data.companyName,
                bio: data.bio,
                logo: data.logo,
                bankDetails: data.bankDetails
            }
        });
    }
}
