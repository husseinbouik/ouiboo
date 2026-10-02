import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Headers,
  RawBodyRequest,
  Req,
  Logger,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto, VerifyPaymentDto, ProcessRefundDto } from './dto/payment.dto';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';
import { RateLimit, RateLimitGuard } from '../common/rate-limit.guard';

@Controller('payments')
@UseGuards(RateLimitGuard)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private paymentsService: PaymentsService) {}

  /**
   * Initiate a payment session
   */
  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @RateLimit({ points: 12, windowMs: 60_000, keyPrefix: 'payments:initiate' })
  @HttpCode(HttpStatus.CREATED)
  async initiatePayment(@Req() req: Request & { user?: any }, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiatePayment(dto, req.user?.userId);
  }

  /**
   * Verify payment status
   */
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @RateLimit({ points: 20, windowMs: 60_000, keyPrefix: 'payments:verify' })
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Req() req: Request & { user?: any }, @Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto, req.user?.userId);
  }

  /**
   * Process refund
   */
  @Post('refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @RateLimit({ points: 10, windowMs: 60_000, keyPrefix: 'payments:refund' })
  @HttpCode(HttpStatus.OK)
  async processRefund(@Body() dto: ProcessRefundDto) {
    return this.paymentsService.processRefund(dto);
  }

  /**
   * Handle payment provider webhooks
   * Supports provider-specific headers:
   * - Stripe: stripe-signature
   * - CMI: x-signature or x-cmi-signature
   */
  @Post('webhook/:provider')
  @RateLimit({ points: 120, windowMs: 60_000, keyPrefix: 'payments:webhook' })
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ) {
    const payload = (req.rawBody || '').toString();
    
    // Read provider-specific signature headers
    let signature: string | undefined;
    if (provider.toLowerCase() === 'stripe') {
      signature = headers['stripe-signature'];
    } else if (provider.toLowerCase() === 'cmi') {
      signature = headers['x-signature'] || headers['x-cmi-signature'];
    } else if (provider.toLowerCase() === 'cashplus') {
      signature = headers['x-signature'] || headers['x-cashplus-signature'];
    } else {
      signature = headers['x-signature'];
    }

    if (!signature) {
      this.logger.warn(`Missing signature header for webhook provider: ${provider}`);
      throw new BadRequestException(`Missing signature header for provider: ${provider}`);
    }

    this.logger.log(`Webhook received from provider: ${provider}`);
    return this.paymentsService.handleWebhookCallback(provider, payload, signature);
  }
}
