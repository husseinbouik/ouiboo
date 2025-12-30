import { Controller, Post, Get, Body, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
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
    uploadPaymentProof(@Param('id') id: string, @Body('imageUrl') imageUrl: string) {
        return this.bookingsService.uploadPaymentProof(id, imageUrl);
    }
}
