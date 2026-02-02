import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@ouiboo/database';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { InitiatePaymentDto, VerifyPaymentDto, ProcessRefundDto } from './dto/payment.dto';
import { PaymentMethod } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private paymentProviderFactory: PaymentProviderFactory,
  ) {}

  /**
   * Initiate a payment session
   */
  async initiatePayment(dto: InitiatePaymentDto) {
    // Verify booking exists and is in correct status
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { session: true, traveler: true },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Booking is not in pending status');
    }

    // Get payment provider
    const provider = this.paymentProviderFactory.getProvider(
      dto.provider as any,
    );

    // Initiate payment
    const paymentSession = await provider.initiatePayment(
      dto.amount,
      dto.bookingId,
      dto.travelerEmail,
      dto.travelerName,
    );

    // Create payment transaction record
    await this.prisma.paymentTransaction.create({
      data: {
        bookingId: dto.bookingId,
        amount: dto.amount,
        method: PaymentMethod.GATEWAY,
        transactionId: paymentSession.sessionId,
        status: 'INITIATED',
        provider: dto.provider,
        providerData: paymentSession.metadata,
      },
    });

    // Update booking with payment gateway info
    await this.prisma.booking.update({
      where: { id: dto.bookingId },
      data: {
        paymentMethod: PaymentMethod.GATEWAY,
        paymentGatewayTransactionId: paymentSession.sessionId,
      },
    });

    return {
      redirectUrl: paymentSession.redirectUrl,
      sessionId: paymentSession.sessionId,
      expiresAt: paymentSession.expiresAt,
    };
  }

  /**
   * Verify payment status
   */
  async verifyPayment(dto: VerifyPaymentDto) {
    const provider = this.paymentProviderFactory.getProvider(
      dto.provider as any,
    );

    const result = await provider.verifyPayment(
      dto.transactionId,
      dto.bookingId,
    );

    // Update payment transaction
    await this.prisma.paymentTransaction.updateMany({
      where: {
        bookingId: dto.bookingId,
        transactionId: dto.transactionId,
      },
      data: {
        status: result.status === 'success' ? 'SUCCESS' : 'FAILED',
        providerData: result.metadata,
      },
    });

    if (result.status === 'success') {
      // Update booking payment status
      await this.prisma.booking.update({
        where: { id: dto.bookingId },
        data: {
          paymentStatus: 'PAID',
          paymentGatewayMetadata: result.metadata,
        },
      });
    }

    return result;
  }

  /**
   * Process refund
   */
  async processRefund(dto: ProcessRefundDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    const provider = this.paymentProviderFactory.getProvider(
      dto.provider as any,
    );

    const refundResult = await provider.processRefund(
      dto.transactionId,
      dto.amount,
    );

    if (refundResult.success) {
      // Update booking with refund info
      await this.prisma.booking.update({
        where: { id: dto.bookingId },
        data: {
          refundAmount: dto.amount,
          refundStatus: 'PROCESSED',
          refundProcessedAt: new Date(),
        },
      });

      // Create refund transaction
      if (booking.session) {
        const session = await this.prisma.tripSession.findUnique({
          where: { id: booking.sessionId },
          include: { template: { include: { agency: true } } },
        });

        if (session?.template?.agency?.id) {
          await this.prisma.walletTransaction.create({
            data: {
              walletId: session.template.agency.id,
              amount: -dto.amount,
              type: 'REFUND',
              reason: `Refund for booking ${dto.bookingId}`,
            },
          });
        }
      }
    }

    return refundResult;
  }

  /**
   * Handle webhook callback
   */
  async handleWebhookCallback(
    provider: string,
    payload: string,
    signature: string,
  ) {
    const paymentProvider = this.paymentProviderFactory.getProvider(
      provider as any,
    );

    // Validate webhook signature
    const isValid = paymentProvider.validateWebhookSignature(
      payload,
      signature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Parse and process webhook
    const data = JSON.parse(payload);
    // TODO: Implement webhook processing logic based on provider
    return { received: true };
  }
}
