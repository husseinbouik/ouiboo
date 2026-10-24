import {
    Controller,
    Get,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Req,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../common/rate-limit.guard';
import { PaymentRequestsService } from './payment-requests.service';
import { PaymentWebhooksService } from './webhooks.service';

/**
 * #373 — payment orchestration endpoints (plan §56).
 *
 * Traveller-facing request creation + status polling, and the public
 * provider webhook ingress. Note what is NOT here: there is no "return"
 * endpoint that confirms a payment — after a provider redirect the
 * traveller polls the read-only status endpoint, and only a signed
 * webhook can move a payment to captured (plan §23).
 */
@ApiTags('Payment Providers')
@Controller()
export class PaymentProvidersController {
    constructor(
        private readonly paymentRequestsService: PaymentRequestsService,
        private readonly webhooksService: PaymentWebhooksService,
    ) { }

    @Post('bookings/:id/payment/deposit')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RateLimitGuard)
    @RateLimit({ points: 12, windowMs: 60_000, keyPrefix: 'payments:request' })
    @ApiOperation({ summary: 'Create a deposit payment request for a booking (server-computed amount)' })
    createDeposit(@Request() req, @Param('id') id: string) {
        return this.paymentRequestsService.createRequest(req.user.userId, id, 'DEPOSIT');
    }

    @Post('bookings/:id/payment/balance')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RateLimitGuard)
    @RateLimit({ points: 12, windowMs: 60_000, keyPrefix: 'payments:request' })
    @ApiOperation({ summary: 'Create a balance payment request (only after the trip is confirmed)' })
    createBalance(@Request() req, @Param('id') id: string) {
        return this.paymentRequestsService.createRequest(req.user.userId, id, 'BALANCE');
    }

    @Get('bookings/:id/payments')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'List payment requests and recorded payments for a booking' })
    listBookingPayments(@Request() req, @Param('id') id: string) {
        return this.paymentRequestsService.listForBooking(
            { userId: req.user.userId, role: req.user.role, tenantId: req.user.tenantId ?? req.tenantId },
            id,
        );
    }

    @Get('payment-attempts/:id/status')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Read-only payment attempt status (poll after a provider redirect)' })
    getAttemptStatus(@Request() req, @Param('id') id: string) {
        return this.paymentRequestsService.getAttemptStatus(
            { userId: req.user.userId, role: req.user.role, tenantId: req.user.tenantId ?? req.tenantId },
            id,
        );
    }

    /**
     * Provider webhook ingress. Public by design — authenticity comes
     * from the adapter's signature validation, not from a session.
     */
    @Post('payments/webhooks/:provider')
    @UseGuards(RateLimitGuard)
    @RateLimit({ points: 120, windowMs: 60_000, keyPrefix: 'payments:webhooks' })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Receive a signed payment-provider webhook' })
    async handleWebhook(
        @Param('provider') provider: string,
        @Req() req: RawBodyRequest<ExpressRequest>,
        @Headers('x-psp-signature') signature?: string,
    ) {
        const rawBody = (req.rawBody || Buffer.from('')).toString();
        return this.webhooksService.handleWebhook(provider.toLowerCase(), rawBody, signature);
    }
}
