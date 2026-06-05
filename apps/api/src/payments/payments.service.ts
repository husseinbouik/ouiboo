import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { InitiatePaymentDto, VerifyPaymentDto, ProcessRefundDto } from './dto/payment.dto';
import { PaymentMethod, BookingStatus, BookingPaymentStatus, RefundStatus, TransactionType } from '@ouiboo/database';
import { MoneyInput, decimalAbs, decimalEqualsMoney, multiplyMoney, toMoneyDecimal, toMoneyString } from '../common/money.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: DatabaseService,
    private paymentProviderFactory: PaymentProviderFactory,
    private emailService: EmailService,
  ) { }

  /**
   * Initiate a payment session
   * Security: Validates amount against booking session price to prevent underpayment tampering
   */
  async initiatePayment(dto: InitiatePaymentDto, requesterId?: string) {
    // Verify booking exists and is in correct status
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { session: true, traveler: true },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (!requesterId || booking.travelerId !== requesterId) {
      throw new BadRequestException('Booking does not belong to the authenticated traveler');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Booking is not in pending status');
    }

    // SECURITY: Validate payment amount against booking total price
    // Calculate expected amount from authoritative sources (not client input)
    const expectedAmount = multiplyMoney(booking.session.price, booking.guestsCount);

    if (!decimalEqualsMoney(dto.amount, expectedAmount)) {
      this.logger.warn(
        `Payment amount mismatch for booking ${dto.bookingId}: expected ${toMoneyString(expectedAmount)}, got ${dto.amount}`,
      );
      throw new BadRequestException(
        `Amount mismatch: expected ${toMoneyString(expectedAmount)}, got ${dto.amount}`,
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
      `Payment session initiated for booking ${dto.bookingId}: ${toMoneyString(expectedAmount)} ${booking.session.currency} via ${dto.provider}`,
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
  async verifyPayment(dto: VerifyPaymentDto, requesterId?: string) {
    const provider = this.paymentProviderFactory.getProvider(
      dto.provider as any,
    );

    const result = await provider.verifyPayment(
      dto.transactionId,
      dto.bookingId,
    );

    // Fetch booking with session details for potential failure handling
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        session: { include: { template: true } },
      },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (!requesterId || booking.travelerId !== requesterId) {
      throw new BadRequestException('Booking does not belong to the authenticated traveler');
    }

    if (result.status === 'success') {
      // Update payment transaction
      await this.prisma.paymentTransaction.updateMany({
        where: {
          bookingId: dto.bookingId,
          transactionId: dto.transactionId,
        },
        data: {
          status: 'SUCCESS',
          providerData: result.metadata,
        },
      });

      // Transition booking to CONFIRMED state and update payment status
      await this.transitionBookingToConfirmed(dto.bookingId, result.metadata);
    } else {
      // Handle payment verification failure: CANCELLED booking, FAILED payment, release seats
      // Guard: Check current booking status to prevent double-adjustment
      if (booking.status !== 'CANCELLED' && booking.paymentStatus !== 'FAILED') {
        // Wrap in transaction
        await this.prisma.$transaction(async (tx) => {
          // Update payment transaction
          await tx.paymentTransaction.updateMany({
            where: {
              bookingId: dto.bookingId,
              transactionId: dto.transactionId,
            },
            data: {
              status: 'FAILED',
              providerData: result.metadata,
            },
          });

          // Update booking status to CANCELLED and payment status to FAILED
          await tx.booking.update({
            where: { id: dto.bookingId },
            data: {
              status: 'CANCELLED',
              paymentStatus: BookingPaymentStatus.FAILED,
            },
          });

          // Increment available seats back to trip session
          await tx.tripSession.update({
            where: { id: booking.sessionId },
            data: {
              availableSeats: {
                increment: booking.guestsCount,
              },
            },
          });

          // Add audit log entry
          await tx.auditLog.create({
            data: {
              actorId: booking.travelerId,
              action: 'PAYMENT_FAILED',
              targetType: 'BOOKING',
              targetId: dto.bookingId,
              metadata: {
                provider: dto.provider,
                transactionId: dto.transactionId,
                reason: result.error || 'Payment verification failed',
                seatsReleased: booking.guestsCount,
              },
            },
          });
        });
      }
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
      toMoneyDecimal(dto.amount),
    );

    if (refundResult.success) {
      // Update booking with refund info
      await this.prisma.booking.update({
        where: { id: dto.bookingId },
        data: {
          refundAmount: toMoneyDecimal(dto.amount),
          refundStatus: RefundStatus.PROCESSED,
          refundProcessedAt: new Date(),
          paymentStatus: BookingPaymentStatus.REFUNDED,
        },
      });

      // Create refund transaction
      if (booking.sessionId) {
        const session = await this.prisma.tripSession.findUnique({
          where: { id: booking.sessionId },
          include: { template: { include: { agency: { include: { wallet: true } } } } },
        });

        // Ensure agency wallet is loaded
        const agencyWallet = session?.template?.agency?.wallet;
        if (!agencyWallet) {
          throw new BadRequestException('Agency missing wallet');
        }

        await this.prisma.wallet.update({
          where: { id: agencyWallet.id },
          data: {
            availableBalance: {
              decrement: decimalAbs(dto.amount),
            },
          },
        });

        // Create refund transaction (debit agency wallet)
        await this.prisma.walletTransaction.create({
          data: {
            walletId: agencyWallet.id,
            amount: decimalAbs(dto.amount).neg(),
            type: TransactionType.REFUND,
            reason: `Refund for booking ${dto.bookingId}`,
            referenceId: refundResult.refundId || null,
          },
        });

      }

      this.logger.log(`Refund processed for booking ${dto.bookingId}: ${refundResult.refundId}`);
    }

    return refundResult;
  }

  async refundBookingById(bookingId: string, amount?: MoneyInput) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        paymentTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (booking.paymentMethod !== PaymentMethod.GATEWAY) {
      throw new BadRequestException('Only gateway payments can be refunded automatically');
    }

    if (booking.paymentStatus === BookingPaymentStatus.REFUNDED) {
      throw new BadRequestException('Booking has already been refunded');
    }

    if (booking.paymentStatus !== BookingPaymentStatus.PAID) {
      throw new BadRequestException('Only paid bookings can be refunded');
    }

    const successfulTransaction = booking.paymentTransactions.find(
      (transaction) => transaction.status === 'SUCCESS' && transaction.provider && transaction.transactionId,
    );

    const provider = successfulTransaction?.provider;
    const transactionId = successfulTransaction?.transactionId || booking.paymentGatewayTransactionId;

    if (!provider || !transactionId) {
      throw new BadRequestException('Missing provider transaction data for this booking');
    }

    return this.processRefund({
      bookingId,
      amount: amount ?? booking.totalAmount,
      provider,
      transactionId,
    });
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
      } else if (provider.toLowerCase() === 'cashplus') {
        await this.handleCashPlusWebhook(data);
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
      include: { traveler: true, session: { include: { template: { include: { agency: true } } } } },
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
        amountReceived: toMoneyString(toMoneyDecimal(session.amount_total).div(100)),
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
      include: {
        booking: {
          include: {
            session: { include: { template: true } },
          },
        },
      },
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found for Stripe payment intent: ${paymentIntent.id}`);
      return;
    }

    const booking = transaction.booking;

    // Guard: Check current booking status to prevent double-adjustment
    if (booking.status === 'CANCELLED' || booking.paymentStatus === 'FAILED') {
      this.logger.warn(`Booking ${booking.id} already cancelled or failed, skipping adjustment`);
      return;
    }

    // Wrap in transaction: Update booking status to CANCELLED, increment available seats, mark payment as FAILED
    await this.prisma.$transaction(async (tx) => {
      // Mark payment transaction as FAILED
      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          providerData: paymentIntent,
        },
      });

      // Update booking status to CANCELLED and payment status to FAILED
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          paymentStatus: BookingPaymentStatus.FAILED,
        },
      });

      // Increment available seats back to trip session
      await tx.tripSession.update({
        where: { id: booking.sessionId },
        data: {
          availableSeats: {
            increment: booking.guestsCount,
          },
        },
      });

      // Add audit log entry
      await tx.auditLog.create({
        data: {
          actorId: booking.travelerId,
          action: 'PAYMENT_FAILED',
          targetType: 'BOOKING',
          targetId: booking.id,
          metadata: {
            provider: 'Stripe',
            paymentIntentId: paymentIntent.id,
            reason: paymentIntent.last_payment_error?.message || 'Payment declined',
            seatsReleased: booking.guestsCount,
          },
        },
      });
    });

    this.logger.log(`Payment failed for booking ${booking.id} (Stripe: ${paymentIntent.id}), seats released: ${booking.guestsCount}`);
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
        refundAmount: toMoneyDecimal(charge.amount_refunded).div(100).toDecimalPlaces(2),
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
        amountReceived: toMoneyString(toMoneyDecimal(paymentIntent.amount).div(100)),
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
      include: { traveler: true, session: { include: { template: { include: { agency: true } } } } },
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

    // Fetch booking with session details
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        session: { include: { template: true } },
      },
    });

    if (!booking) {
      this.logger.warn(`Booking not found: ${bookingId}`);
      return;
    }

    // Guard: Check current booking status to prevent double-adjustment
    if (booking.status === 'CANCELLED' || booking.paymentStatus === 'FAILED') {
      this.logger.warn(`Booking ${bookingId} already cancelled or failed, skipping adjustment`);
      return;
    }

    // Wrap in transaction: Update booking status to CANCELLED, increment available seats, mark payment as FAILED
    await this.prisma.$transaction(async (tx) => {
      // Mark payment transactions as FAILED
      await tx.paymentTransaction.updateMany({
        where: {
          bookingId,
        },
        data: {
          status: 'FAILED',
          providerData: event,
        },
      });

      // Update booking status to CANCELLED and payment status to FAILED
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          paymentStatus: BookingPaymentStatus.FAILED,
        },
      });

      // Increment available seats back to trip session
      await tx.tripSession.update({
        where: { id: booking.sessionId },
        data: {
          availableSeats: {
            increment: booking.guestsCount,
          },
        },
      });

      // Add audit log entry
      await tx.auditLog.create({
        data: {
          actorId: booking.travelerId,
          action: 'PAYMENT_FAILED',
          targetType: 'BOOKING',
          targetId: bookingId,
          metadata: {
            provider: 'CMI',
            cmiTransactionId: event.transactionId,
            reason: event.failureReason || 'CMI payment failed',
            seatsReleased: booking.guestsCount,
          },
        },
      });
    });

    this.logger.log(`Payment failed for booking ${bookingId} (CMI: ${event.transactionId}), seats released: ${booking.guestsCount}`);
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
        refundAmount: toMoneyDecimal(event.amount),
        refundProcessedAt: new Date(),
      },
    });

    this.logger.log(`Refund processed for booking ${bookingId}: ${event.refundId}`);
  }

  /**
   * Handle CashPlus-specific webhook events
   */
  private async handleCashPlusWebhook(event: any) {
    this.logger.log(`Processing CashPlus webhook event: ${event.status || 'unknown'}`);

    const bookingId = event.orderId || event.metadata?.bookingId;
    if (!bookingId) {
      this.logger.warn('CashPlus webhook missing bookingId');
      return;
    }

    // CashPlus event status mapping: SUCCESS, PENDING, FAILED
    const status = event.status || event.eventStatus;

    if (status === 'SUCCESS' || status === 'PAID') {
      await this.handleCashPlusPaymentSuccess(event);
    } else if (status === 'FAILED' || status === 'REJECTED') {
      await this.handleCashPlusPaymentFailed(event);
    } else {
      this.logger.debug(`Unhandled CashPlus event status: ${status}`);
    }
  }

  /**
   * Handle CashPlus payment success
   */
  private async handleCashPlusPaymentSuccess(event: any) {
    const bookingId = event.orderId || event.metadata?.bookingId;
    if (!bookingId) {
      this.logger.warn('CashPlus webhook missing bookingId for success');
      return;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { traveler: true, session: { include: { template: { include: { agency: { include: { wallet: true } } } } } } },
    });

    if (!booking) {
      this.logger.warn(`Booking not found for CashPlus webhook: ${bookingId}`);
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
      provider: 'CASHPLUS',
      transactionId: event.transactionId,
      amountReceived: event.amount,
      orderId: event.orderId,
    });
  }

  /**
   * Handle CashPlus payment failed
   */
  private async handleCashPlusPaymentFailed(event: any) {
    const bookingId = event.orderId || event.metadata?.bookingId;
    if (!bookingId) {
      this.logger.warn('CashPlus webhook missing bookingId for failure');
      return;
    }

    // Fetch booking with session details
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        session: { include: { template: true } },
      },
    });

    if (!booking) {
      this.logger.warn(`Booking not found: ${bookingId}`);
      return;
    }

    // Guard: Check current booking status to prevent double-adjustment
    if (booking.status === 'CANCELLED' || booking.paymentStatus === 'FAILED') {
      this.logger.warn(`Booking ${bookingId} already cancelled or failed, skipping adjustment`);
      return;
    }

    // Wrap in transaction: Update booking status to CANCELLED, increment available seats, mark payment as FAILED
    await this.prisma.$transaction(async (tx) => {
      // Mark payment transactions as FAILED
      await tx.paymentTransaction.updateMany({
        where: {
          bookingId,
        },
        data: {
          status: 'FAILED',
          providerData: event,
        },
      });

      // Update booking status to CANCELLED and payment status to FAILED
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          paymentStatus: BookingPaymentStatus.FAILED,
        },
      });

      // Increment available seats back to trip session
      await tx.tripSession.update({
        where: { id: booking.sessionId },
        data: {
          availableSeats: {
            increment: booking.guestsCount,
          },
        },
      });

      // Add audit log entry
      await tx.auditLog.create({
        data: {
          actorId: booking.travelerId,
          action: 'PAYMENT_FAILED',
          targetType: 'BOOKING',
          targetId: bookingId,
          metadata: {
            provider: 'CashPlus',
            cashplusTransactionId: event.transactionId,
            reason: event.failureReason || 'CashPlus payment failed',
            seatsReleased: booking.guestsCount,
          },
        },
      });
    });

    this.logger.log(`Payment failed for booking ${bookingId} (CashPlus: ${event.transactionId}), seats released: ${booking.guestsCount}`);
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
            template: { include: { agency: { include: { wallet: true } } } },
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

    // Credit agency wallet for the confirmed booking.
    const agencyWallet = await this.prisma.wallet.upsert({
      where: { agencyId: booking.session.template.agencyId },
      update: {
        availableBalance: {
          increment: booking.totalAmount,
        },
      },
      create: {
        agencyId: booking.session.template.agencyId,
        availableBalance: booking.totalAmount,
        pendingBalance: 0,
      },
    });

    await this.prisma.walletTransaction.create({
      data: {
        walletId: agencyWallet.id,
        amount: booking.totalAmount,
        type: TransactionType.BOOKING,
        reason: `Payment received for booking ${bookingId}`,
        referenceId: bookingId,
      },
    });

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
        subject: `Booking Confirmed - ${booking.session.template.title}`,
        message: `Your booking for ${booking.session.template.title} has been confirmed.`,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    this.logger.log(`Booking ${bookingId} transitioned to CONFIRMED state`);
    return confirmedBooking;
  }
}
