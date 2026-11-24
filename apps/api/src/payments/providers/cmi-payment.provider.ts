import { Injectable } from '@nestjs/common';
import {
  PaymentSession,
  PaymentVerificationResult,
  PaymentProvider,
} from '../interfaces/payment-provider.interface';

/**
 * B3: explicit failure raised whenever the CMI provider is selected or
 * invoked. The CMI integration is unfinished (initiate / verify / refund
 * / webhook were TODO placeholders) and card payments via CMI are a
 * parked partner decision (#362). Until the integration is implemented
 * and contract-tested, every path that reaches CMI must fail closed
 * with this error instead of silently running placeholder code that
 * builds and signs payloads against a guessed API shape.
 */
export class CmiProviderNotImplementedError extends Error {
  constructor() {
    super(
      'CMI payment provider is not implemented and is disabled. ' +
        'Card payments via CMI are parked (see #362); use a manual payment method instead.',
    );
    this.name = 'CmiProviderNotImplementedError';
  }
}

/**
 * CMI Payment Gateway Provider — LOCKED STUB (B3).
 *
 * This class intentionally contains no CMI API client, and it is
 * deliberately NOT registered in the payments module, so it cannot be
 * injected anywhere. If it is ever constructed directly, every
 * operation still fails explicitly with
 * {@link CmiProviderNotImplementedError}. Selection is blocked
 * upstream as well: `PaymentProviderFactory.getProvider('CMI')` throws
 * the same error, and `PaymentProviderDto` no longer accepts 'CMI', so
 * no checkout or webhook path can reach CMI in normal flow.
 *
 * Do NOT re-add implementation here without completing the CMI
 * integration and its contract tests (parked decision #362).
 */
@Injectable()
export class CMIPaymentProvider implements PaymentProvider {
  async initiatePayment(): Promise<PaymentSession> {
    throw new CmiProviderNotImplementedError();
  }

  async verifyPayment(): Promise<PaymentVerificationResult> {
    throw new CmiProviderNotImplementedError();
  }

  async processRefund(): Promise<{
    success: boolean;
    refundId?: string;
    error?: string;
  }> {
    throw new CmiProviderNotImplementedError();
  }

  validateWebhookSignature(): boolean {
    throw new CmiProviderNotImplementedError();
  }
}
