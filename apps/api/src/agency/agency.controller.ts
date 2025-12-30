import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';
import { DatabaseService } from '../database/database.service';

@ApiTags('Agency')
@Controller('agency')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Agency)
export class AgencyController {
    constructor(private readonly prisma: DatabaseService) { }

    @Get('stats')
    @ApiOperation({ summary: 'Get agency dashboard stats' })
    async getStats(@Request() req) {
        const agency = await this.prisma.agencyProfile.findUnique({
            where: { userId: req.user.userId },
        });

        if (!agency) {
            return {
                revenue: 0,
                activeTrips: 0,
                totalBookings: 0,
                totalCustomers: 0,
            };
        }

        const [tripsCount, bookings, wallet] = await Promise.all([
            this.prisma.tripTemplate.count({
                where: { agencyId: agency.id, status: 'ACTIVE' },
            }),
            this.prisma.booking.findMany({
                where: {
                    session: {
                        template: { agencyId: agency.id }
                    },
                },
                select: {
                    totalAmount: true,
                    status: true,
                    travelerId: true,
                }
            }),
            this.prisma.wallet.findUnique({
                where: { agencyId: agency.id }
            })
        ]);

        const revenue = bookings
            .filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
            .reduce((sum, b) => sum + b.totalAmount, 0);

        const uniqueCustomers = new Set(bookings.map(b => b.travelerId)).size;

        return {
            revenue,
            activeTrips: tripsCount,
            totalBookings: bookings.length,
            totalCustomers: uniqueCustomers,
            wallet: wallet || { availableBalance: 0, pendingBalance: 0 }
        };
    }

    @Get('trips')
    @ApiOperation({ summary: 'Get agency trips' })
    async getTrips(@Request() req) {
        const agency = await this.prisma.agencyProfile.findUnique({
            where: { userId: req.user.userId },
        });

        if (!agency) return [];

        return this.prisma.tripTemplate.findMany({
            where: { agencyId: agency.id },
            include: {
                sessions: {
                    include: {
                        _count: {
                            select: { bookings: true }
                        }
                    }
                }
            }
        });
    }

    @Get('bookings')
    @ApiOperation({ summary: 'Get agency bookings' })
    async getBookings(@Request() req) {
        const agency = await this.prisma.agencyProfile.findUnique({
            where: { userId: req.user.userId },
        });

        if (!agency) return [];

        return this.prisma.booking.findMany({
            where: {
                session: {
                    template: { agencyId: agency.id }
                },
            },
            include: {
                session: {
                    include: {
                        template: true
                    }
                },
                traveler: {
                    select: {
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: {
                bookingDate: 'desc'
            }
        });
    }

    @Get('payouts')
    @ApiOperation({ summary: 'Get agency payout history' })
    async getPayouts(@Request() req) {
        const agency = await this.prisma.agencyProfile.findUnique({
            where: { userId: req.user.userId },
        });

        if (!agency) return [];

        return this.prisma.payoutRequest.findMany({
            where: { agencyId: agency.id },
            orderBy: { requestedAt: 'desc' },
            take: 20
        });
    }
}
