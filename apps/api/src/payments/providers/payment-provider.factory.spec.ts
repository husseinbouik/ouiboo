import { PaymentProviderFactory } from './payment-provider.factory';
import {
  CMIPaymentProvider,
  CmiProviderNotImplementedError,
} from './cmi-payment.provider';
import { StripePaymentProvider } from './stripe-payment.provider';
import { CashPlusPaymentProvider } from './cashplus-payment.provider';
import { PaymentProvider } from '../interfaces/payment-provider.interface';

/**
 * B3 — CMI stub lock. The CMI provider is an unfinished stub behind a
 * parked partner decision (#362). Selecting it must fail explicitly at
 * the factory, while the real providers keep resolving normally.
 */
describe('PaymentProviderFactory — CMI lock (B3)', () => {
  const stripeProvider = { name: 'stripe-stub' } as unknown as StripePaymentProvider;
  const cashplusProvider = { name: 'cashplus-stub' } as unknown as CashPlusPaymentProvider;
  const factory = new PaymentProviderFactory(stripeProvider, cashplusProvider);

  it('throws the explicit not-implemented error for CMI', () => {
    expect(() => factory.getProvider('CMI')).toThrow(
      CmiProviderNotImplementedError,
    );
    expect(() => factory.getProvider('CMI')).toThrow(/not implemented/);
  });

  it('still resolves the Stripe provider', () => {
    expect(factory.getProvider('STRIPE')).toBe(stripeProvider);
  });

  it('still resolves the Cash Plus provider', () => {
    expect(factory.getProvider('CASHPLUS')).toBe(cashplusProvider);
  });

  it('still rejects unknown providers', () => {
    expect(() => factory.getProvider('PAYPAL' as never)).toThrow(
      /Unknown payment provider/,
    );
  });
});

describe('CMIPaymentProvider — locked stub (B3)', () => {
  // Typed via the interface, exactly as callers consume the provider.
  const provider: PaymentProvider = new CMIPaymentProvider();

  it('initiatePayment fails explicitly', async () => {
    await expect(
      provider.initiatePayment(100, 'booking-1', 'a@b.c', 'A'),
    ).rejects.toThrow(CmiProviderNotImplementedError);
  });

  it('verifyPayment fails explicitly', async () => {
    await expect(provider.verifyPayment('tx-1', 'booking-1')).rejects.toThrow(
      CmiProviderNotImplementedError,
    );
  });

  it('processRefund fails explicitly', async () => {
    await expect(provider.processRefund('tx-1', 100)).rejects.toThrow(
      CmiProviderNotImplementedError,
    );
  });

  it('validateWebhookSignature fails explicitly (never returns true)', () => {
    expect(() => provider.validateWebhookSignature('{}', 'sig')).toThrow(
      CmiProviderNotImplementedError,
    );
  });
});
