import { Injectable, BadRequestException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { InitiatePaymentDto, VerifyPaymentDto, ProcessRefundDto } from './dto/payment.dto';
import { PaymentVerificationResult } from './interfaces/payment-provider.interface';
import { PaymentMethod, BookingStatus, BookingPaymentStatus, RefundStatus, PaymentCustodian, PaymentLedgerEntryType, PaymentLedgerSource } from '@ouiboo/database';
import { MoneyInput, decimalEqualsMoney, multiplyMoney, toMoneyDecimal, toMoneyString } from '../common/money.util';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: DatabaseService,
    private paymentProviderFactory: PaymentProviderFactory,
    private emailService: EmailService,
    private externalPaymentsService: ExternalPaymentsService,
  ) { }

  /**
   * Initiate a payment session
   * Security: Validates amount against booking session price to prevent underpayment tampering
   */
  async initiatePayment(dto: InitiatePaymentDto, requesterId?: string) {
    this.ensureGatewayPaymentsEnabled();
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
      booking.traveler.email,
      booking.traveler.name || booking.traveler.email,
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
   *
   * #496: the local PaymentTransaction is the authority. Verification first
   * resolves exactly one local transaction bound to (booking, provider,
   * provider transaction reference); the provider result must agree with
   * it on booking reference, amount and currency; and the transaction is
   * claimed with a conditional update — a provider "success" that updates
   * zero local rows can never confirm the booking.
   */
  async verifyPayment(dto: VerifyPaymentDto, requesterId?: string) {
    this.ensureGatewayPaymentsEnabled();
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

    // #496: resolve the authoritative local transaction BEFORE trusting
    // any provider answer. Client-supplied identifiers alone prove nothing.
    const localTransaction = await this.resolveAuthoritativeTransaction(
      dto.bookingId,
      dto.provider,
      dto.transactionId,
    );

    // Idempotent replay: this transaction already succeeded and the booking
    // is already paid — a duplicate verification (double submit, return-path
    // refresh, webhook race) is a no-op success, never a second confirmation.
    if (
      localTransaction.status === 'SUCCESS' &&
      booking.paymentStatus === BookingPaymentStatus.PAID
    ) {
      this.logger.log(
        `Payment already verified for booking ${dto.bookingId}; duplicate verification ignored`,
      );
      return {
        status: 'success' as const,
        transactionId: dto.transactionId,
        metadata: (localTransaction.providerData as Record<string, any>) ?? undefined,
      };
    }

    if (
      localTransaction.status !== 'INITIATED' &&
      localTransaction.status !== 'PENDING' &&
      localTransaction.status !== 'SUCCESS'
    ) {
      throw new BadRequestException(
        `Payment transaction is not in a verifiable state (${localTransaction.status})`,
      );
    }

    const provider = this.paymentProviderFactory.getProvider(
      dto.provider as any,
    );

    const result = await provider.verifyPayment(
      dto.transactionId,
      dto.bookingId,
    );

    // #496: whenever the provider asserts which booking its transaction
    // belongs to, it must be THIS booking — on every outcome, so a foreign
    // transaction can neither confirm nor cancel this booking.
    const providerBookingId = this.providerAssertedBookingId(result);
    if (providerBookingId && providerBookingId !== dto.bookingId) {
      this.logger.warn(
        `Provider ${dto.provider} transaction ${dto.transactionId} belongs to booking ${providerBookingId}, not ${dto.bookingId}; verification rejected`,
      );
      throw new BadRequestException(
        'Payment transaction does not belong to this booking',
      );
    }

    if (result.status === 'success') {
      // #496: the paid amount/currency the provider reports must match the
      // authoritative local transaction amount and the booking currency.
      this.assertProviderAmountCurrency(result, localTransaction, booking);

      // Atomically claim the local transaction. The conditional update only
      // matches while the transaction is still in the state we resolved, so
      // concurrent verifications cannot both proceed to confirmation.
      const claimed = await this.prisma.paymentTransaction.updateMany({
        where: {
          id: localTransaction.id,
          bookingId: dto.bookingId,
          transactionId: dto.transactionId,
          status: localTransaction.status,
        },
        data: {
          status: 'SUCCESS',
          providerData: result.metadata,
        },
      });

      if (claimed.count !== 1) {
        // Zero rows updated: another flow already moved this transaction.
        // Confirm nothing here — succeed idempotently only if that flow
        // already paid the booking.
        const current = await this.prisma.booking.findUnique({
          where: { id: dto.bookingId },
        });
        if (current?.paymentStatus === BookingPaymentStatus.PAID) {
          this.logger.log(
            `Payment for booking ${dto.bookingId} already confirmed by a concurrent flow; verification is idempotent`,
          );
          return result;
        }
        throw new BadRequestException(
          'Payment could not be bound to the booking transaction; booking was not confirmed',
        );
      }

      // Transition booking to CONFIRMED state and update payment status
      await this.transitionBookingToConfirmed(dto.bookingId, result.metadata);
    } else if (result.status === 'failure') {
      await this.transitionBookingToPaymentFailed(
        booking,
        dto.provider,
        result.metadata,
        dto.transactionId,
        result.error || result.errorMessage || 'Payment verification failed',
      );
    }

    this.logger.log(`Payment verified for booking ${dto.bookingId}: ${result.status}`);
    return result;
  }

  /**
   * Process refund
   *
   * #497: the refund target is resolved from the booking's successful local
   * payment transaction — never from caller-supplied identifiers alone.
   * The amount is validated against the remaining refundable balance, and
   * the refund is claimed with a conditional state transition BEFORE the
   * provider is called, so concurrent/refreshed requests cannot
   * double-refund. A deterministic provider idempotency key makes a retry
   * of the same claim replay one provider operation.
   */
  async processRefund(dto: ProcessRefundDto) {
    this.ensureGatewayPaymentsEnabled();
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { paymentTransactions: true },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (booking.paymentStatus !== BookingPaymentStatus.PAID) {
      throw new BadRequestException('Only paid bookings can be refunded');
    }

    if (booking.refundStatus === RefundStatus.PENDING) {
      throw new BadRequestException('A refund is already in progress for this booking');
    }

    // #497: prove the caller-supplied reference IS the booking's successful
    // payment, from the local ledger — not merely a plausible identifier.
    const transactions =
      (booking as any).paymentTransactions ??
      (await this.prisma.paymentTransaction.findMany({
        where: { bookingId: dto.bookingId },
      }));
    const successfulMatches = (transactions as any[]).filter(
      (transaction) =>
        transaction.status === 'SUCCESS' &&
        transaction.transactionId === dto.transactionId &&
        transaction.provider &&
        transaction.provider.toUpperCase() === dto.provider.toUpperCase(),
    );

    if (successfulMatches.length !== 1) {
      throw new BadRequestException(
        'No successful payment transaction for this booking matches the refund request',
      );
    }

    const transaction = successfulMatches[0];

    // #497: bound the refund by the authoritative paid amount (the local
    // transaction, in the booking's currency) less refunds already made.
    const paidAmount = toMoneyDecimal(transaction.amount);
    const alreadyRefunded = booking.refundAmount
      ? toMoneyDecimal(booking.refundAmount)
      : toMoneyDecimal(0);
    const requestedAmount = toMoneyDecimal(dto.amount);

    if (!requestedAmount.greaterThan(0)) {
      throw new BadRequestException('Refund amount must be positive');
    }

    const refundedTotal = alreadyRefunded.plus(requestedAmount);
    if (refundedTotal.greaterThan(paidAmount)) {
      throw new BadRequestException(
        `Refund amount exceeds the remaining refundable balance (${toMoneyString(paidAmount.minus(alreadyRefunded))} ${booking.currency})`,
      );
    }

    // #497: atomically claim the refund BEFORE calling the provider. The
    // claim only matches while the booking still shows the exact refund
    // state we validated (status PENDING is the in-flight marker), so a
    // concurrent or refreshed duplicate loses the race here and never
    // reaches the provider.
    const claimed = await this.prisma.booking.updateMany({
      where: {
        id: dto.bookingId,
        paymentStatus: BookingPaymentStatus.PAID,
        refundStatus: booking.refundStatus ?? null,
        refundAmount: booking.refundAmount ?? null,
      },
      data: {
        refundStatus: RefundStatus.PENDING,
      },
    });

    if (claimed.count !== 1) {
      throw new BadRequestException(
        'Refund could not be claimed; another refund may already be in progress for this booking',
      );
    }

    const provider = this.paymentProviderFactory.getProvider(
      dto.provider as any,
    );

    // Deterministic: the same (booking, transaction, cumulative total)
    // always produces the same key, so a retry replays one provider refund.
    const idempotencyKey = `ouiboo-refund-${dto.bookingId}-${transaction.transactionId}-${toMoneyString(refundedTotal)}`;

    let refundResult: { success: boolean; refundId?: string; error?: string };
    try {
      refundResult = await provider.processRefund(
        transaction.transactionId,
        requestedAmount,
        idempotencyKey,
      );
    } catch (error) {
      await this.releaseRefundClaim(dto.bookingId);
      throw error;
    }

    if (!refundResult.success) {
      // Recoverable, support-visible failure: the claim is released to
      // FAILED (booking.refundStatus) and no refund totals move, so the
      // refund can be retried without corrupting payment state.
      await this.releaseRefundClaim(dto.bookingId);
      return refundResult;
    }

    if (refundResult.success) {
      // Update booking with refund info. Totals accumulate across partial
      // refunds; the booking is REFUNDED only once fully refunded.
      await this.prisma.booking.update({
        where: { id: dto.bookingId },
        data: {
          refundAmount: refundedTotal,
          refundStatus: RefundStatus.PROCESSED,
          refundProcessedAt: new Date(),
          paymentStatus: decimalEqualsMoney(refundedTotal, paidAmount)
            ? BookingPaymentStatus.REFUNDED
            : BookingPaymentStatus.PAID,
        },
      });

      // #368: record the refund as an external payment event. The provider
      // returns the money to the traveller from the agency's merchant
      // account; OuiBoo never held it, so there is no OuiBoo balance to
      // debit and no agency wallet is required.
      if (booking.sessionId) {
        const session = await this.prisma.tripSession.findUnique({
          where: { id: booking.sessionId },
          include: { template: { select: { agencyId: true } } },
        });

        if (session?.template?.agencyId) {
          await this.externalPaymentsService.recordRefund({
            bookingId: dto.bookingId,
            agencyId: session.template.agencyId,
            travelerId: booking.travelerId,
            amount: dto.amount,
            currency: booking.currency,
            method: PaymentMethod.GATEWAY,
            provider: dto.provider,
            externalReference: refundResult.refundId || null,
            externalTransactionId: transaction.transactionId,
            custodian: PaymentCustodian.AGENCY_PSP,
            source: PaymentLedgerSource.GATEWAY_REFUND,
          });
        }
      }

      this.logger.log(`Refund processed for booking ${dto.bookingId}: ${refundResult.refundId}`);
    }

    return refundResult;
  }

  async refundBookingById(bookingId: string, amount?: MoneyInput) {
    this.ensureGatewayPaymentsEnabled();
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

    if (booking.refundStatus === RefundStatus.PENDING) {
      throw new BadRequestException('A refund is already in progress for this booking');
    }

    const successfulTransaction = booking.paymentTransactions.find(
      (transaction) => transaction.status === 'SUCCESS' && transaction.provider && transaction.transactionId,
    );

    const provider = successfulTransaction?.provider;
    const transactionId = successfulTransaction?.transactionId || booking.paymentGatewayTransactionId;

    if (!provider || !transactionId) {
      throw new BadRequestException('Missing provider transaction data for this booking');
    }

    // #497: with no explicit amount, refund only what remains refundable
    // on the authoritative transaction — never the full booking total
    // after a partial refund has already been made.
    const alreadyRefunded = booking.refundAmount
      ? toMoneyDecimal(booking.refundAmount)
      : toMoneyDecimal(0);
    const remainingAmount = successfulTransaction
      ? toMoneyDecimal(successfulTransaction.amount).minus(alreadyRefunded)
      : toMoneyDecimal(booking.totalAmount);

    return this.processRefund({
      bookingId,
      amount: amount ?? remainingAmount,
      provider,
      transactionId,
    });
  }

  /**
   * #496: resolve exactly one authoritative local payment transaction for
   * (booking, provider transaction reference) and prove it belongs to the
   * requested provider. Throws when there is no such transaction, when the
   * reference is ambiguous, or when the provider does not match.
   */
  private async resolveAuthoritativeTransaction(
    bookingId: string,
    provider: string,
    transactionId: string,
  ) {
    const matches = await this.prisma.paymentTransaction.findMany({
      where: { bookingId, transactionId },
    });

    if (!matches || matches.length !== 1) {
      throw new BadRequestException(
        'No authoritative payment transaction found for this booking and provider reference',
      );
    }

    const transaction = matches[0];
    if (
      !transaction.provider ||
      transaction.provider.toUpperCase() !== provider.toUpperCase()
    ) {
      throw new BadRequestException(
        'Payment transaction does not belong to the requested provider',
      );
    }

    return transaction;
  }

  /**
   * #596: provider id-mapping for webhook confirmations.
   *
   * A webhook's transaction id is NOT necessarily the initiation
   * session id stored in `PaymentTransaction.transactionId`: CMI and
   * CashPlus report a distinct transaction id in their webhooks, while
   * the initiation response carried both ids. The mapping is therefore
   * resolved from data already stored on the local transaction — no
   * schema change is needed:
   *
   * - `transactionId` itself (the initiation session id; for Stripe
   *   this is the checkout session id the webhook also reports), and
   * - every provider id recorded in `providerData` / `metadata` at
   *   initiation (the CMI/CashPlus adapters store the full initiation
   *   response there, including the provider's own transaction id)
   *   or by an earlier bound flow (e.g. a Stripe session object, which
   *   carries its payment-intent id).
   *
   * A webhook confirmation may proceed only when its candidate ids
   * resolve to EXACTLY ONE local transaction for the booking and
   * provider. Zero matches — or an ambiguous mapping — parks the
   * confirmation: nothing is confirmed, an error-level (alerting) log
   * is emitted, and the webhook is rejected so the provider retries
   * and the parked event stays visible instead of silently confirming
   * a booking on an unmatched payment. Log lines on this path carry
   * no payment identifiers or payload data.
   */
  private providerIdAliases(record: any): string[] {
    if (!record || typeof record !== 'object') return [];
    const keys = [
      'id',
      'transactionId',
      'sessionId',
      'session_id',
      'paymentIntentId',
      'payment_intent',
      'chargeId',
      'charge_id',
      'providerTransactionId',
      'initiationId',
    ];
    const ids: string[] = [];
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value) ids.push(value);
    }
    if (record.metadata && typeof record.metadata === 'object') {
      ids.push(...this.providerIdAliases(record.metadata));
    }
    return ids;
  }

  private webhookCandidateIds(event: any): string[] {
    return [...new Set(this.providerIdAliases(event))];
  }

  private async resolveWebhookTransaction(
    bookingId: string,
    provider: string,
    candidateIds: string[],
  ) {
    if (!candidateIds.length) return null;

    const rows = await this.prisma.paymentTransaction.findMany({
      where: { bookingId },
    });

    const matches = (rows ?? []).filter((transaction: any) => {
      if (
        transaction.provider &&
        transaction.provider.toUpperCase() !== provider.toUpperCase()
      ) {
        return false;
      }
      const aliases = new Set<string>([
        transaction.transactionId,
        ...this.providerIdAliases(transaction.providerData),
        ...this.providerIdAliases(transaction.metadata),
      ]);
      return candidateIds.some((id) => aliases.has(id));
    });

    return matches.length === 1 ? matches[0] : null;
  }

  private parkUnmatchedWebhookConfirmation(provider: string): never {
    // Alerting on the park path: error-level log, deliberately free of
    // payment identifiers and payload data (repo rule: never log
    // payment payloads). The booking is NOT confirmed.
    this.logger.error(
      `Webhook payment confirmation parked for provider ${provider}: no unique local transaction mapping; booking was not confirmed`,
    );
    throw new BadRequestException(
      'Webhook payment could not be matched to a local payment transaction; booking was not confirmed',
    );
  }

  /**
   * #596: claim the one local transaction a webhook confirmation maps
   * to, conditionally on the state it was resolved in — the webhook
   * equivalent of the #496 zero-row claim block. A claim that updates
   * zero rows parks the confirmation instead of confirming.
   */
  private async claimWebhookTransaction(
    bookingId: string,
    provider: string,
    candidateIds: string[],
    providerData: any,
  ) {
    const transaction = await this.resolveWebhookTransaction(
      bookingId,
      provider,
      candidateIds,
    );

    if (!transaction) {
      this.parkUnmatchedWebhookConfirmation(provider);
    }

    // Idempotent replay: a duplicate webhook for an already-claimed
    // transaction is a no-op; the booking transition is itself
    // conditional and idempotent.
    if (transaction.status === 'SUCCESS') {
      return transaction;
    }

    if (
      transaction.status !== 'INITIATED' &&
      transaction.status !== 'PENDING'
    ) {
      this.parkUnmatchedWebhookConfirmation(provider);
    }

    const claimed = await this.prisma.paymentTransaction.updateMany({
      where: {
        id: transaction.id,
        bookingId,
        status: transaction.status,
      },
      data: {
        status: 'SUCCESS',
        providerData,
      },
    });

    if (claimed.count !== 1) {
      // Zero rows claimed: another flow moved this transaction.
      // Proceed only if that flow already claimed it successfully.
      const rows = await this.prisma.paymentTransaction.findMany({
        where: { bookingId },
      });
      const current = (rows ?? []).find(
        (row: any) => row.id === transaction.id,
      );
      if (current?.status === 'SUCCESS') {
        return current;
      }
      this.parkUnmatchedWebhookConfirmation(provider);
    }

    return transaction;
  }

  /**
   * #496: the booking reference a provider result asserts, if any —
   * structured field first, then the metadata/order-reference shapes the
   * provider adapters return.
   */
  private providerAssertedBookingId(
    result: PaymentVerificationResult,
  ): string | undefined {
    const metadata: any = result.metadata ?? {};
    return (
      result.bookingId ??
      metadata.bookingId ??
      metadata.orderId ??
      metadata.metadata?.bookingId ??
      undefined
    );
  }

  /**
   * #496: when the provider reports a paid amount or currency, both must
   * match the authoritative local transaction amount and booking currency.
   */
  private assertProviderAmountCurrency(
    result: PaymentVerificationResult,
    localTransaction: { amount: MoneyInput },
    booking: { currency?: string | null },
  ) {
    const metadata: any = result.metadata ?? {};
    const reportedAmount = result.amount ?? metadata.amount ?? undefined;

    if (reportedAmount !== undefined && reportedAmount !== null) {
      if (!decimalEqualsMoney(reportedAmount, localTransaction.amount)) {
        throw new BadRequestException(
          'Provider amount does not match the booking payment transaction',
        );
      }
    }

    const reportedCurrency = result.currency ?? metadata.currency ?? undefined;
    if (reportedCurrency) {
      const expectedCurrency = (booking.currency || 'MAD').toUpperCase();
      if (String(reportedCurrency).toUpperCase() !== expectedCurrency) {
        throw new BadRequestException(
          'Provider currency does not match the booking currency',
        );
      }
    }
  }

  /**
   * #497: release an in-flight refund claim to a recoverable, support-
   * visible FAILED state after a provider failure, without moving any
   * refund totals or booking payment state.
   */
  private async releaseRefundClaim(bookingId: string) {
    await this.prisma.booking.updateMany({
      where: { id: bookingId, refundStatus: RefundStatus.PENDING },
      data: { refundStatus: RefundStatus.FAILED },
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
    this.ensureGatewayPaymentsEnabled();
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

    // #596: Stripe's webhook session id IS the initiation session id
    // stored on the local transaction, so the mapping resolves
    // directly; a zero-match parks instead of confirming.
    await this.claimWebhookTransaction(
      bookingId,
      'STRIPE',
      this.webhookCandidateIds(session),
      session,
    );

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

    await this.transitionBookingToPaymentFailed(
      booking,
      'Stripe',
      paymentIntent,
      transaction.transactionId || paymentIntent.id,
      paymentIntent.last_payment_error?.message || 'Payment declined',
    );
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

    // #596: claim the mapped local transaction (zero-row claim parks)
    // before confirming on a payment-intent success.
    await this.claimWebhookTransaction(
      transaction.booking.id,
      'STRIPE',
      this.webhookCandidateIds(paymentIntent),
      paymentIntent,
    );

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

    // #596: the CMI webhook transaction id differs from the initiation
    // session id stored on the local transaction; resolve it through
    // the provider id-mapping (ids recorded in providerData at
    // initiation). A zero-match parks instead of confirming.
    await this.claimWebhookTransaction(
      bookingId,
      'CMI',
      this.webhookCandidateIds(event),
      event,
    );

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

    await this.transitionBookingToPaymentFailed(
      booking,
      'CMI',
      event,
      event.transactionId,
      event.failureReason || 'CMI payment failed',
    );
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

    // #596: same id-mapping as CMI — the CashPlus webhook transaction
    // id differs from the initiation session id; resolve it through
    // the ids recorded in providerData at initiation. A zero-match
    // parks instead of confirming.
    await this.claimWebhookTransaction(
      bookingId,
      'CASHPLUS',
      this.webhookCandidateIds(event),
      event,
    );

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

    await this.transitionBookingToPaymentFailed(
      booking,
      'CashPlus',
      event,
      event.transactionId,
      event.failureReason || 'CashPlus payment failed',
    );
  }

  private async transitionBookingToPaymentFailed(
    booking: {
      id: string;
      sessionId: string;
      guestsCount: number;
      travelerId: string;
    },
    provider: string,
    providerData: any,
    transactionId: string | undefined,
    reason: string,
  ) {
    const transitioned = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.booking.updateMany({
        where: {
          id: booking.id,
          status: BookingStatus.PENDING,
          paymentStatus: BookingPaymentStatus.UNPAID,
        },
        data: {
          status: BookingStatus.CANCELLED,
          paymentStatus: BookingPaymentStatus.FAILED,
          cancelledAt: new Date(),
          cancellationReason: 'PAYMENT_FAILED',
        },
      });

      if (claimed.count !== 1) return false;

      await tx.paymentTransaction.updateMany({
        where: {
          bookingId: booking.id,
          ...(transactionId ? { transactionId } : {}),
        },
        data: {
          status: 'FAILED',
          providerData,
        },
      });

      await tx.tripSession.update({
        where: { id: booking.sessionId },
        data: {
          availableSeats: {
            increment: booking.guestsCount,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: booking.travelerId,
          action: 'PAYMENT_FAILED',
          targetType: 'BOOKING',
          targetId: booking.id,
          metadata: {
            provider,
            transactionId: transactionId || null,
            reason,
            seatsReleased: booking.guestsCount,
          },
        },
      });

      return true;
    });

    if (!transitioned) {
      this.logger.log(`Booking ${booking.id} is no longer awaiting payment; failure event ignored`);
      return false;
    }

    this.logger.log(
      `Payment failed for booking ${booking.id} (${provider}); seats released: ${booking.guestsCount}`,
    );
    return true;
  }

  /**
   * Transition booking to CONFIRMED state after successful payment
   * Updates booking status, payment status, and triggers confirmation notifications
   */
  private async transitionBookingToConfirmed(bookingId: string, paymentMetadata: any) {
    const transition = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          traveler: true,
          session: { include: { template: true } },
        },
      });

      if (!booking) {
        throw new BadRequestException('Booking not found');
      }

      const updated = await tx.booking.updateMany({
        where: {
          id: bookingId,
          paymentStatus: { not: BookingPaymentStatus.PAID },
          status: { notIn: [BookingStatus.CANCELLED, BookingStatus.COMPLETED] },
        },
        data: {
          status: BookingStatus.CONFIRMED,
          paymentStatus: BookingPaymentStatus.PAID,
          paymentGatewayMetadata: paymentMetadata,
          confirmedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        return { booking, transitioned: false };
      }

      // #368: record the captured payment as a fact — the money sits with
      // the agency's payment provider (custodian AGENCY_PSP), never in a
      // withdrawable OuiBoo balance.
      await this.externalPaymentsService.recordPaymentVerifiedInTransaction(
        tx,
        {
          bookingId,
          agencyId: booking.session.template.agencyId,
          travelerId: booking.travelerId,
          amount: booking.totalAmount,
          currency: booking.currency,
          method: PaymentMethod.GATEWAY,
          provider: paymentMetadata?.provider ?? null,
          externalTransactionId: paymentMetadata?.transactionId ?? null,
          custodian: PaymentCustodian.AGENCY_PSP,
          source: PaymentLedgerSource.GATEWAY_WEBHOOK,
        },
        PaymentLedgerEntryType.PAYMENT_CAPTURED,
      );

      return { booking, transitioned: true };
    });

    if (!transition.transitioned) {
      this.logger.log(`Booking ${bookingId} was already confirmed; duplicate payment event ignored`);
      return transition.booking;
    }

    const { booking } = transition;

    // Send payment confirmation email to traveler
    try {
      await this.emailService.sendPaymentConfirmation(
        booking.traveler.email,
        booking.session.template.title,
        booking.locale,
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
    return booking;
  }

  private ensureGatewayPaymentsEnabled() {
    if (process.env.ENABLE_GATEWAY_PAYMENTS !== 'true') {
      throw new ServiceUnavailableException('Gateway payments are not enabled');
    }
  }
}
