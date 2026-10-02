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
   */
  processRefund(
    transactionId: string,
    amount: MoneyInput,
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
