import { Controller, Post, Get, Body, UseGuards, Request, Param, Patch, UploadedFile, UseInterceptors, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ALLOWED_MIME_TYPES_REGEX, MAX_UPLOAD_SIZE_BYTES } from '../upload/upload.constants';

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
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    uploadPaymentProof(
        @Request() req,
        @Param('id') id: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_SIZE_BYTES }),
                    new FileTypeValidator({
                        fileType: ALLOWED_MIME_TYPES_REGEX,
                        fallbackToMimetype: true,
                    }),
                ],
                errorHttpStatusCode: 400,
            }),
        )
        file: Express.Multer.File,
    ) {
        return this.bookingsService.uploadPaymentProof(id, req.user.userId, file);
    }

    @Get(':id/payment-proof/download')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Download payment proof (booking owner or agency)' })
    async downloadPaymentProof(
        @Request() req,
        @Param('id') id: string,
        @Res() res: Response,
    ) {
        const { filePath } = await this.bookingsService.getPaymentProofFile(id, req.user.userId, req.user?.role);

        if (!this.bookingsService.isLocal()) {
            return res.redirect(filePath);
        }

        return res.sendFile(filePath);
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
        return this.bookingsService.verifyPayment(id, req.tenantId, approved, rejectionReason);
    }

    @Patch(':id/cancel')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Cancel a booking' })
    cancelBooking(@Request() req, @Param('id') id: string) {
        return this.bookingsService.cancelBooking(id, req.user.userId);
    }
}
