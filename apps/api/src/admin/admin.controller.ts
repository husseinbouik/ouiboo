import { Controller, Get, Post, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';
import { WalletsService } from '../wallets/wallets.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@ApiBearerAuth()
export class AdminController {
    constructor(
        private db: DatabaseService,
        private walletsService: WalletsService
    ) { }

    @Get('pending-payments')
    @ApiOperation({ summary: 'Get payment proofs pending verification' })
    getPendingPayments() {
        return this.db.paymentProof.findMany({
            where: { status: 'PENDING' },
            include: { booking: { include: { traveler: true, session: { include: { template: true } } } } }
        });
    }

    @Post('payments/:id/verify')
    @ApiOperation({ summary: 'Approve or reject payment proof' })
    async verifyPayment(@Param('id') id: string, @Body('status') status: 'VERIFIED' | 'REJECTED') {
        return this.db.$transaction(async (tx) => {
            const proof = await tx.paymentProof.update({
                where: { id },
                data: { status }
            });

            const booking = await tx.booking.update({
                where: { id: proof.bookingId },
                data: { status: status === 'VERIFIED' ? 'CONFIRMED' : 'CANCELLED' },
                include: { session: { include: { template: true } } }
            });

            if (status === 'VERIFIED') {
                await this.walletsService.creditWallet(
                    booking.session.template.agencyId,
                    booking.totalAmount,
                    `Booking #${booking.id} confirmed`
                );
            }

            return proof;
        });
    }

    @Get('pending-agencies')
    @ApiOperation({ summary: 'Get agencies pending verification' })
    getPendingAgencies() {
        return this.db.agencyProfile.findMany({
            where: { verificationStatus: 'PENDING' },
            include: { user: true }
        });
    }

    @Post('agencies/:id/verify')
    @ApiOperation({ summary: 'Approve or reject agency' })
    async verifyAgency(@Param('id') id: string, @Body('status') status: 'VERIFIED' | 'REJECTED') {
        return this.db.agencyProfile.update({
            where: { id },
            data: { verificationStatus: status }
        });
    }

    @Get('pending-trips')
    @ApiOperation({ summary: 'Get trips pending verification' })
    getPendingTrips() {
        return this.db.tripTemplate.findMany({
            where: { status: 'DRAFT' }, // Assuming Draft is what they start as
            include: { agency: true }
        });
    }

    @Post('trips/:id/verify')
    @ApiOperation({ summary: 'Approve or reject trip' })
    async verifyTrip(@Param('id') id: string, @Body('status') status: 'ACTIVE' | 'ARCHIVED') {
        return this.db.tripTemplate.update({
            where: { id },
            data: { status: status }
        });
    }

    @Get('agencies')
    @ApiOperation({ summary: 'Get all agencies' })
    getAgencies() {
        return this.db.agencyProfile.findMany({
            include: { user: true }
        });
    }

    @Patch('agencies/:id/status')
    @ApiOperation({ summary: 'Update agency verification or subscription status' })
    async updateAgencyStatus(@Param('id') id: string, @Body() data: { verificationStatus?: any, subscriptionStatus?: any }) {
        return this.db.agencyProfile.update({
            where: { id },
            data: {
                verificationStatus: data.verificationStatus,
                subscriptionStatus: data.subscriptionStatus
            }
        });
    }

    @Get('bookings')
    @ApiOperation({ summary: 'Get all bookings in the system' })
    getBookings() {
        return this.db.booking.findMany({
            include: {
                traveler: true,
                session: { include: { template: true } },
                paymentProof: true
            },
            orderBy: { bookingDate: 'desc' }
        });
    }

    @Get('payout-requests')
    @ApiOperation({ summary: 'Get all payout requests' })
    getPayoutRequests() {
        return this.db.payoutRequest.findMany({
            include: { agency: true }
        });
    }

    @Post('payouts/:id/process')
    @ApiOperation({ summary: 'Mark payout as paid or rejected' })
    async processPayout(@Param('id') id: string, @Body('status') status: 'PAID' | 'REJECTED') {
        return this.db.payoutRequest.update({
            where: { id },
            data: {
                status: status,
                processedAt: new Date()
            }
        });
    }
}
