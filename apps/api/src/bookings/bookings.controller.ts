import { Controller, HttpCode, Post, Get, Body, Headers, UseGuards, Request, Param, Patch, UploadedFile, UseInterceptors, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Res, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { RebookingService } from './rebooking.service';
import { normalizeTripLocale } from '../trips/trip-translations.util';
import { ConfirmBankPaymentDto, CreateBookingDto, DisputeAttendanceDto, MarkAttendanceDto, VerifyBookingPassDto, VerifyManualPaymentDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ALLOWED_MIME_TYPES_REGEX, MAX_UPLOAD_SIZE_BYTES } from '../upload/upload.constants';
import { RateLimit, RateLimitGuard, RateLimitSensitive } from '../common/rate-limit.guard';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
    constructor(
        private readonly bookingsService: BookingsService,
        private readonly rebookingService: RebookingService,
    ) { }

    @Post()
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Create a new booking' })
    create(
        @Request() req,
        @Body() dto: CreateBookingDto,
        // #494 (B16): one client-generated UUID per booking attempt;
        // a replay returns the original booking, a replay with a
        // different payload is a 409. Absent header = legacy behaviour.
        @Headers('idempotency-key') idempotencyKey?: string,
    ) {
        return this.bookingsService.create(req.user.userId, dto, idempotencyKey);
    }

    @Get('my-bookings')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current user bookings' })
    findMyBookings(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
        return this.bookingsService.findAllByTraveler(
            req.user.userId,
            page ? Number(page) : 1,
            limit ? Number(limit) : 10,
        );
    }

    @Get('rebooking-suggestions')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Book-again suggestions from agencies the traveler has booked with (#444)' })
    findRebookingSuggestions(
        @Request() req,
        @Query('locale') locale?: string,
        @Headers('x-ouiboo-language') languageHeader?: string,
    ) {
        return this.rebookingService.getSuggestions(
            req.user.userId,
            normalizeTripLocale(locale) ?? normalizeTripLocale(languageHeader),
        );
    }

    @Get(':id')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get a booking by ID for the traveler, owning agency, or admin' })
    findOne(
        @Request() req,
        @Param('id') id: string,
        @Query('locale') locale?: string,
        @Headers('x-ouiboo-language') languageHeader?: string,
    ) {
        return this.bookingsService.findOneForUser(
            id,
            req.user.userId,
            req.user?.role,
            normalizeTripLocale(locale) ?? normalizeTripLocale(languageHeader),
        );
    }

    @Post(':id/payment-proof')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RateLimitGuard)
    @RateLimit({ points: 6, windowMs: 10 * 60_000, keyPrefix: 'bookings:payment-proof' })
    @RateLimitSensitive()
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
        // #494 (B16): one UUID per proof attempt; replay semantics in
        // the service (same file = stored proof, different = 409).
        @Headers('idempotency-key') idempotencyKey?: string,
    ) {
        return this.bookingsService.uploadPaymentProof(id, req.user.userId, file, idempotencyKey);
    }

    @Post(':id/duplicate-credit')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
    @Roles(UserRole.Agency)
    @ApiOperation({ summary: 'Flag a duplicate bank credit observed for a booking (#494)' })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['amount'],
            properties: {
                amount: { type: 'number', example: 200 },
                bankReference: { type: 'string', nullable: true },
                note: { type: 'string', nullable: true },
            },
        },
    })
    flagDuplicateCredit(
        @Request() req,
        @Param('id') id: string,
        @Body() body: { amount: unknown; bankReference?: string | null; note?: string | null },
    ) {
        return this.bookingsService.createDuplicateCreditFlag(id, req.tenantId, req.user.userId, body ?? ({} as never));
    }

    @Patch(':id/verify-payment')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, RateLimitGuard)
    @Roles(UserRole.Agency)
    @RateLimit({ points: 30, windowMs: 60_000, keyPrefix: 'bookings:verify-payment' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Approve or reject a manual payment proof for an agency-owned booking' })
    verifyPayment(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: VerifyManualPaymentDto,
    ) {
        return this.bookingsService.verifyPayment(id, req.tenantId, dto.approved, dto.rejectionReason);
    }

    @Patch(':id/confirm-bank-payment')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, RateLimitGuard)
    @Roles(UserRole.Agency)
    @RateLimit({ points: 30, windowMs: 60_000, keyPrefix: 'bookings:confirm-bank-payment' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Confirm an accepted proof against the agency bank account (settles the payment, #422)' })
    confirmBankPayment(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: ConfirmBankPaymentDto,
    ) {
        return this.bookingsService.confirmBankPayment(id, req.tenantId, req.user.userId, dto);
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
        const result = await this.bookingsService.getPaymentProofFile(id, req.user.userId, req.user?.role);

        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', 'inline');
        return res.send(result.buffer);
    }

    @Patch(':id/attendance')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, RateLimitGuard)
    @Roles(UserRole.Agency)
    @RateLimit({ points: 30, windowMs: 60_000, keyPrefix: 'bookings:attendance' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Record attendance for an agency-owned booking: attended completes it and makes it review-eligible; absent marks it NO_SHOW (#434)' })
    markAttendance(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: MarkAttendanceDto,
    ) {
        return this.bookingsService.markAttendance(id, req.tenantId, req.user.userId ?? req.user.id, dto.attended);
    }

    @Get(':id/pass')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get the Booking Pass for a booking (#689): issued once the agency confirms deposit receipt; the signed token verifies only inside an authenticated agency session' })
    getBookingPass(
        @Request() req,
        @Param('id') id: string,
    ) {
        return this.bookingsService.getBookingPass(id, req.user.userId, req.user?.role);
    }

    @Post('pass/verify')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, RateLimitGuard)
    @Roles(UserRole.Agency)
    @RateLimit({ points: 30, windowMs: 60_000, keyPrefix: 'bookings:pass-verify' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Verify a Booking Pass token (agency-authenticated, #689) — an unauthenticated scan verifies nothing; a valid scan at/after trip start records the QR check-in (#693)' })
    verifyBookingPass(
        @Request() req,
        @Body() dto: VerifyBookingPassDto,
    ) {
        return this.bookingsService.verifyBookingPass(dto.token, req.tenantId, req.user.userId ?? req.user.id);
    }

    @Post(':id/attendance-dispute')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RateLimitGuard)
    @RateLimit({ points: 10, windowMs: 60_000, keyPrefix: 'bookings:attendance-dispute' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Dispute the agency-recorded attendance for my booking (#693)' })
    disputeAttendance(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: DisputeAttendanceDto,
    ) {
        return this.bookingsService.disputeAttendance(id, req.user.userId, dto.reason);
    }

    @Patch(':id/cancel')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Cancel a booking' })
    cancelBooking(@Request() req, @Param('id') id: string) {
        return this.bookingsService.cancelBooking(id, req.user.userId);
    }

    @Post(':id/cancel')
    @HttpCode(200)
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Cancel a booking (legacy POST alias)' })
    cancelBookingPostAlias(@Request() req, @Param('id') id: string) {
        return this.bookingsService.cancelBooking(id, req.user.userId);
    }
}



