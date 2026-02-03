import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '../interfaces/payment-provider.interface';
import { CMIPaymentProvider } from './cmi-payment.provider';
import { StripePaymentProvider } from './stripe-payment.provider';
import { CashPlusPaymentProvider } from './cashplus-payment.provider';

export type PaymentProviderType = 'CMI' | 'STRIPE' | 'CASHPLUS';

/**
 * Factory for creating payment provider instances
 */
@Injectable()
export class PaymentProviderFactory {
  constructor(
    private cmiProvider: CMIPaymentProvider,
    private stripeProvider: StripePaymentProvider,
    private cashplusProvider: CashPlusPaymentProvider,
  ) {}

  getProvider(providerType: PaymentProviderType): PaymentProvider {
    switch (providerType) {
      case 'CMI':
        return this.cmiProvider;
      case 'STRIPE':
        return this.stripeProvider;
      case 'CASHPLUS':
        return this.cashplusProvider;
      default:
        throw new Error(`Unknown payment provider: ${providerType}`);
    }
  }
}
