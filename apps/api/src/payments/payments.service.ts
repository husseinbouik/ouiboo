import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@ouiboo/database';
import { EmailService } from '../email/email.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { InitiatePaymentDto, VerifyPaymentDto, ProcessRefundDto } from './dto/payment.dto';
import { PaymentMethod, BookingStatus, BookingPaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private paymentProviderFactory: PaymentProviderFactory,
    private emailService: EmailService,
  ) {}

  /**
   * Initiate a payment session
   * Security: Validates amount against booking session price to prevent underpayment tampering
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

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Booking is not in pending status');
    }

    // SECURITY: Validate payment amount against booking total price
    // Calculate expected amount from authoritative sources (not client input)
    const expectedAmount = booking.session.price * booking.guestsCount;
    
    // Allow small tolerance for floating point precision (0.01 currency units)
    if (Math.abs(dto.amount - expectedAmount) > 0.01) {
      this.logger.warn(
        `Payment amount mismatch for booking ${dto.bookingId}: expected ${expectedAmount}, got ${dto.amount}`,
      );
      throw new BadRequestException(
        `Amount mismatch: expected ${expectedAmount}, got ${dto.amount}`,
      );
    }

    // Get payment provider
    const provider = this.paymentProviderFactory.getProvider(
      dto.provider as any,
    );

    // Initiate payment using validated expectedAmount (not client-provided dto.amount)
    const paymentSession = await provider.initiatePayment(
      expectedAmount,
      dto.bookingId,
      dto.travelerEmail,
      dto.travelerName,
    );

    // Create payment transaction record with validated amount
    await this.prisma.paymentTransaction.create({
      data: {
        bookingId: dto.bookingId,
        amount: expectedAmount,
        method: PaymentMethod.GATEWAY,
        transactionId: paymentSession.sessionId,
        status: 'INITIATED',
        provider: dto.provider,
        providerData: paymentSession.metadata,
      },
    });

    // Update booking with payment gateway info
    // Store total amount if needed for reference
    await this.prisma.booking.update({
      where: { id: dto.bookingId },
      data: {
        paymentMethod: PaymentMethod.GATEWAY,
        paymentGatewayTransactionId: paymentSession.sessionId,
        paymentStatus: BookingPaymentStatus.UNPAID,
        totalAmount: expectedAmount,
      },
    });

    this.logger.log(
      `Payment session initiated for booking ${dto.bookingId}: ${expectedAmount} ${booking.session.currency} via ${dto.provider}`,
    );

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
      // Transition booking to CONFIRMED state and update payment status
      await this.transitionBookingToConfirmed(dto.bookingId, result.metadata);
    }

    this.logger.log(`Payment verified for booking ${dto.bookingId}: ${result.status}`);
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
          refundStatus: 'COMPLETED',
          refundProcessedAt: new Date(),
          paymentStatus: BookingPaymentStatus.REFUNDED,
        },
      });

      // Create refund transaction
      if (booking.sessionId) {
        const session = await this.prisma.tripSession.findUnique({
          where: { id: booking.sessionId },
          include: { template: { include: { agency: true } } },
        });

        if (session?.template?.agency?.walletId) {
          // Add refund back to agency wallet
          await this.prisma.walletTransaction.create({
            data: {
              walletId: session.template.agency.walletId,
              amount: dto.amount,
              type: 'REFUND',
              reason: `Refund for booking ${dto.bookingId}`,
              referenceId: refundResult.refundId,
            },
          });
        }
      }

      this.logger.log(`Refund processed for booking ${dto.bookingId}: ${refundResult.refundId}`);
    }

    return refundResult;
  }

  /**
   * Handle webhook callback from payment providers
   * Parses provider-specific event data and updates booking state accordingly
   */
  async handleWebhookCallback(
    provider: string,
    payload: string,
    signature: string,
  ) {
    this.logger.log(`Processing webhook from ${provider}`);

    const paymentProvider = this.paymentProviderFactory.getProvider(
      provider as any,
    );

    // Validate webhook signature
    const isValid = paymentProvider.validateWebhookSignature(
      payload,
      signature,
    );

    if (!isValid) {
      this.logger.error(`Invalid webhook signature from ${provider}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    try {
      // Parse webhook payload
      const data = JSON.parse(payload);

      // Process webhook events based on provider
      if (provider.toLowerCase() === 'stripe') {
        await this.handleStripeWebhook(data);
      } else if (provider.toLowerCase() === 'cmi') {
        await this.handleCMIWebhook(data);
      } else {
        this.logger.warn(`Unknown payment provider for webhook: ${provider}`);
      }

      this.logger.log(`Webhook processed successfully from ${provider}`);
      return { received: true, processed: true };
    } catch (error) {
      this.logger.error(`Error processing webhook from ${provider}: ${error.message}`);
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  /**
   * Handle Stripe-specific webhook events
   */
  private async handleStripeWebhook(event: any) {
    this.logger.log(`Processing Stripe webhook event type: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await this.handleStripePaymentSuccess(session);
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        await this.handleStripePaymentIntentSuccess(paymentIntent);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        await this.handleStripePaymentFailed(paymentIntent);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        await this.handleStripeRefund(charge);
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  /**
   * Handle Stripe checkout.session.completed event
   */
  private async handleStripePaymentSuccess(session: any) {
    const bookingId = session.metadata?.bookingId;
    if (!bookingId) {
      this.logger.warn('Stripe webhook missing bookingId in metadata');
      return;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { traveler: true, session: { include: { template: true, agency: true } } },
    });

    if (!booking) {
      this.logger.warn(`Booking not found for Stripe webhook: ${bookingId}`);
      return;
    }

    // Update payment transaction
    await this.prisma.paymentTransaction.updateMany({
      where: {
        bookingId,
        transactionId: session.id,
      },
      data: {
        status: 'SUCCESS',
        providerData: session,
      },
    });

    // Transition booking to confirmed
    await this.transitionBookingToConfirmed(bookingId, {
      provider: 'STRIPE',
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      amountReceived: session.amount_total / 100,
    });
  }

  /**
   * Handle Stripe payment_intent.payment_failed event
   */
  private async handleStripePaymentFailed(paymentIntent: any) {
    // Find booking by payment intent
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        transactionId: paymentIntent.id,
      },
      include: { booking: true },
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found for Stripe payment intent: ${paymentIntent.id}`);
      return;
    }

    const booking = transaction.booking;

    // Update payment transaction
    await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        providerData: paymentIntent,
      },
    });

    // Update booking payment status
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: BookingPaymentStatus.FAILED,
      },
    });

    this.logger.log(`Payment failed for booking ${booking.id} (Stripe: ${paymentIntent.id})`);
  }

  /**
   * Handle Stripe charge.refunded event
   */
  private async handleStripeRefund(charge: any) {
    // Find booking by charge
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        providerData: {
          path: ['chargeId'],
          equals: charge.id,
        },
      },
      include: { booking: true },
    });

    if (!transaction) {
      this.logger.debug(`Transaction not found for Stripe refund: ${charge.id}`);
      return;
    }

    const booking = transaction.booking;

    // Update booking
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: BookingPaymentStatus.REFUNDED,
        refundAmount: charge.amount_refunded / 100,
        refundProcessedAt: new Date(),
      },
    });

    this.logger.log(`Refund processed for booking ${booking.id}: ${charge.refund.id}`);
  }

  /**
   * Handle payment_intent.succeeded event (alternative payment success)
   */
  private async handleStripePaymentIntentSuccess(paymentIntent: any) {
    // Find booking by payment intent
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        providerData: {
          path: ['paymentIntentId'],
          equals: paymentIntent.id,
        },
      },
      include: { booking: true },
    });

    if (!transaction) {
      this.logger.debug(`Transaction not found for Stripe payment intent: ${paymentIntent.id}`);
      return;
    }

    // Only process if not already confirmed
    if (transaction.booking.paymentStatus !== BookingPaymentStatus.PAID) {
      await this.transitionBookingToConfirmed(transaction.booking.id, {
        provider: 'STRIPE',
        paymentIntentId: paymentIntent.id,
        amountReceived: paymentIntent.amount / 100,
      });
    }
  }

  /**
   * Handle CMI-specific webhook events
   */
  private async handleCMIWebhook(event: any) {
    this.logger.log(`Processing CMI webhook event: ${event.eventType || 'unknown'}`);

    switch (event.eventType) {
      case 'PAYMENT_SUCCESS':
      case 'payment.success': {
        await this.handleCMIPaymentSuccess(event);
        break;
      }
      case 'PAYMENT_FAILED':
      case 'payment.failed': {
        await this.handleCMIPaymentFailed(event);
        break;
      }
      case 'REFUND_SUCCESS':
      case 'refund.success': {
        await this.handleCMIRefund(event);
        break;
      }
      default:
        this.logger.debug(`Unhandled CMI event type: ${event.eventType}`);
    }
  }

  /**
   * Handle CMI payment success
   */
  private async handleCMIPaymentSuccess(event: any) {
    const bookingId = event.orderId || event.metadata?.bookingId;
    if (!bookingId) {
      this.logger.warn('CMI webhook missing bookingId');
      return;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { traveler: true, session: { include: { template: true, agency: true } } },
    });

    if (!booking) {
      this.logger.warn(`Booking not found for CMI webhook: ${bookingId}`);
      return;
    }

    // Update payment transaction
    await this.prisma.paymentTransaction.updateMany({
      where: {
        bookingId,
        transactionId: event.transactionId,
      },
      data: {
        status: 'SUCCESS',
        providerData: event,
      },
    });

    // Transition booking to confirmed
    await this.transitionBookingToConfirmed(bookingId, {
      provider: 'CMI',
      transactionId: event.transactionId,
      authCode: event.authCode,
      amountReceived: event.amount,
    });
  }

  /**
   * Handle CMI payment failed
   */
  private async handleCMIPaymentFailed(event: any) {
    const bookingId = event.orderId || event.metadata?.bookingId;
    if (!bookingId) {
      this.logger.warn('CMI webhook missing bookingId');
      return;
    }

    // Update payment transaction
    await this.prisma.paymentTransaction.updateMany({
      where: {
        bookingId,
      },
      data: {
        status: 'FAILED',
        providerData: event,
      },
    });

    // Update booking payment status
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: BookingPaymentStatus.FAILED,
      },
    });

    this.logger.log(`Payment failed for booking ${bookingId} (CMI: ${event.transactionId})`);
  }

  /**
   * Handle CMI refund
   */
  private async handleCMIRefund(event: any) {
    const bookingId = event.orderId || event.metadata?.bookingId;
    if (!bookingId) {
      this.logger.warn('CMI webhook missing bookingId for refund');
      return;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      this.logger.warn(`Booking not found for CMI refund: ${bookingId}`);
      return;
    }

    // Update booking
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: BookingPaymentStatus.REFUNDED,
        refundAmount: event.amount,
        refundProcessedAt: new Date(),
      },
    });

    this.logger.log(`Refund processed for booking ${bookingId}: ${event.refundId}`);
  }

  /**
   * Transition booking to CONFIRMED state after successful payment
   * Updates booking status, payment status, and triggers confirmation notifications
   */
  private async transitionBookingToConfirmed(bookingId: string, paymentMetadata: any) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        traveler: true,
        session: {
          include: {
            template: true,
            agency: true,
          },
        },
      },
    });

    if (!booking) {
      this.logger.error(`Booking not found for confirmation: ${bookingId}`);
      return;
    }

    // Update booking to CONFIRMED state
    const confirmedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        paymentStatus: BookingPaymentStatus.PAID,
        paymentGatewayMetadata: paymentMetadata,
        confirmedAt: new Date(),
      },
    });

    // Create wallet transaction for agency commission/payment
    if (booking.session?.agency?.walletId) {
      await this.prisma.walletTransaction.create({
        data: {
          walletId: booking.session.agency.walletId,
          amount: booking.totalPrice,
          type: 'BOOKING',
          reason: `Payment received for booking ${bookingId}`,
          referenceId: bookingId,
        },
      });
    }

    // Send payment confirmation email to traveler
    try {
      await this.emailService.sendPaymentConfirmation(
        booking.traveler.email,
        booking.session.template.title,
      );
      this.logger.log(`Payment confirmation email sent to ${booking.traveler.email}`);
    } catch (error) {
      this.logger.error(`Failed to send payment confirmation email: ${error.message}`);
    }

    // Update notification log
    await this.prisma.notificationLog.create({
      data: {
        userId: booking.travelerId,
        notificationType: 'BOOKING_CONFIRMATION',
        recipientEmail: booking.traveler.email,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    this.logger.log(`Booking ${bookingId} transitioned to CONFIRMED state`);
    return confirmedBooking;
  }
}
