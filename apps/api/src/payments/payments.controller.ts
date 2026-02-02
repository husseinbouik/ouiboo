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
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto, VerifyPaymentDto, ProcessRefundDto } from './dto/payment.dto';
import { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private paymentsService: PaymentsService) {}

  /**
   * Initiate a payment session
   */
  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  async initiatePayment(@Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiatePayment(dto);
  }

  /**
   * Verify payment status
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }

  /**
   * Process refund
   */
  @Post('refund')
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
    } else {
      signature = headers['x-signature'];
    }

    if (!signature) {
      this.logger.warn(`Missing signature header for webhook provider: ${provider}`);
      throw new Error(`Missing signature header for provider: ${provider}`);
    }

    this.logger.log(`Webhook received from provider: ${provider}`);
    return this.paymentsService.handleWebhookCallback(provider, payload, signature);
  }
}
