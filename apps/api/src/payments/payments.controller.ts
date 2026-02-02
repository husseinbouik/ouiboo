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
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto, VerifyPaymentDto, ProcessRefundDto } from './dto/payment.dto';
import { Request } from 'express';

@Controller('payments')
export class PaymentsController {
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
   */
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string,
  ) {
    const payload = (req.rawBody || '').toString();
    return this.paymentsService.handleWebhookCallback(provider, payload, signature);
  }
}
