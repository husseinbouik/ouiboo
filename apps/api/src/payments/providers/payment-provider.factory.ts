import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '../interfaces/payment-provider.interface';
import { CmiProviderNotImplementedError } from './cmi-payment.provider';
import { StripePaymentProvider } from './stripe-payment.provider';
import { CashPlusPaymentProvider } from './cashplus-payment.provider';

export type PaymentProviderType = 'CMI' | 'STRIPE' | 'CASHPLUS';

/**
 * Factory for creating payment provider instances
 */
@Injectable()
export class PaymentProviderFactory {
  constructor(
    private stripeProvider: StripePaymentProvider,
    private cashplusProvider: CashPlusPaymentProvider,
  ) {}

  getProvider(providerType: PaymentProviderType): PaymentProvider {
    switch (providerType) {
      case 'CMI':
        // B3: CMI is a locked stub (parked decision #362). Selection
        // fails explicitly here so no caller — checkout initiate /
        // verify / refund, or the webhook route — can ever receive the
        // placeholder provider, even if the gateway flag is enabled.
        throw new CmiProviderNotImplementedError();
      case 'STRIPE':
        return this.stripeProvider;
      case 'CASHPLUS':
        return this.cashplusProvider;
      default:
        throw new Error(`Unknown payment provider: ${providerType}`);
    }
  }
}
