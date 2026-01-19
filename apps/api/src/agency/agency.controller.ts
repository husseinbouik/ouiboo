import { Controller, Get, UseGuards, Request, Patch, Body, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';
import { DatabaseService } from '../database/database.service';
import { WalletsService } from '../wallets/wallets.service';
import { RequestPayoutDto } from './dto/payout-request.dto';

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
            this.prisma.booking.findMany({
                where: {
                    session: {
                        template: { agencyId }
                    },
                },
                select: {
                    totalAmount: true,
                    status: true,
                    travelerId: true,
                }
            }),
            this.prisma.wallet.findUnique({
                where: { agencyId }
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
        const agencyId = req.tenantId;

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
            }
        });
    }

    @Get('bookings')
    @ApiOperation({ summary: 'Get agency bookings' })
    async getBookings(@Request() req) {
        const agencyId = req.tenantId;

        return this.prisma.booking.findMany({
            where: {
                session: {
                    template: { agencyId }
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
                },
                paymentProof: true
            },
            orderBy: {
                bookingDate: 'desc'
            }
        });
    }

    @Get('payouts')
    @ApiOperation({ summary: 'Get agency payout history' })
    async getPayouts(@Request() req) {
        const agencyId = req.tenantId;

        return this.prisma.payoutRequest.findMany({
            where: { agencyId },
            orderBy: { requestedAt: 'desc' },
            take: 20
        });
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
