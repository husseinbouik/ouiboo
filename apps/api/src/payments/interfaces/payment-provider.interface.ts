export interface PaymentSession {
  sessionId: string;
  redirectUrl: string;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

export interface PaymentVerificationResult {
  status: 'success' | 'failure' | 'pending';
  transactionId?: string;
  error?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  /**
   * #496: booking reference asserted by the provider for this transaction
   * (checkout-session metadata / order reference), when the provider
   * reports one. The service rejects verification when it names a
   * different booking than the one being verified.
   */
  bookingId?: string;
  /**
   * #496: amount the provider reports as paid, in major units, when the
   * provider reports one. Validated against the authoritative local
   * payment transaction before any booking confirmation.
   */
  amount?: MoneyInput;
  /**
   * #496: currency the provider reports for the payment, when reported.
   * Validated against the booking currency before confirmation.
   */
  currency?: string;
}

export interface PaymentProvider {
  /**
   * Initialize a payment session
   */
  initiatePayment(
    amount: MoneyInput,
    bookingId: string,
    travelerEmail: string,
    travelerName: string,
  ): Promise<PaymentSession>;

  /**
   * Verify payment status
   */
  verifyPayment(
    transactionId: string,
    bookingId: string,
  ): Promise<PaymentVerificationResult>;

  /**
   * Process refund
   *
   * #497: `idempotencyKey` is a deterministic key derived from the
   * booking, the authoritative local transaction and the cumulative
   * refunded total, so a retried refund replays the same provider
   * operation instead of creating a second one.
   */
  processRefund(
    transactionId: string,
    amount: MoneyInput,
    idempotencyKey?: string,
  ): Promise<{ success: boolean; refundId?: string; error?: string }>;

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(
    payload: string,
    signature: string,
  ): boolean;
}
import { type MoneyInput } from '../../common/money.util';
