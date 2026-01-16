import { Controller, Post, Get, Body, UseGuards, Request, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) { }

    @Post()
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Create a new booking' })
    create(@Request() req, @Body() dto: CreateBookingDto) {
        return this.bookingsService.create(req.user.userId, dto);
    }

    @Get('my-bookings')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current user bookings' })
    findMyBookings(@Request() req) {
        return this.bookingsService.findAllByTraveler(req.user.userId);
    }

    @Post(':id/payment-proof')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Upload payment proof for a booking' })
    uploadPaymentProof(@Request() req, @Param('id') id: string, @Body('imageUrl') imageUrl: string) {
        return this.bookingsService.uploadPaymentProof(id, req.user.userId, imageUrl);
    }
    @Patch(':id/verify-payment')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
    @Roles(UserRole.Agency)
    @ApiOperation({ summary: 'Verify payment proof (Agency only)' })
    verifyPayment(
        @Request() req,
        @Param('id') id: string,
        @Body('approved') approved: boolean,
        @Body('rejectionReason') rejectionReason?: string
    ) {
        return this.bookingsService.verifyPayment(id, req.tenantId, approved);
    }

    @Patch(':id/cancel')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Cancel a booking' })
    cancelBooking(@Request() req, @Param('id') id: string) {
        return this.bookingsService.cancelBooking(id, req.user.userId);
    }
}
