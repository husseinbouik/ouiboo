import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '../interfaces/payment-provider.interface';
import { CMIPaymentProvider } from './cmi-payment.provider';
import { StripePaymentProvider } from './stripe-payment.provider';

export type PaymentProviderType = 'CMI' | 'STRIPE' | 'PAYPAL';

/**
 * Factory for creating payment provider instances
 */
@Injectable()
export class PaymentProviderFactory {
  constructor(
    private cmiProvider: CMIPaymentProvider,
    private stripeProvider: StripePaymentProvider,
  ) {}

  getProvider(providerType: PaymentProviderType): PaymentProvider {
    switch (providerType) {
      case 'CMI':
        return this.cmiProvider;
      case 'STRIPE':
        return this.stripeProvider;
      case 'PAYPAL':
        // TODO: Implement PayPal provider
        throw new Error('PayPal provider not yet implemented');
      default:
        throw new Error(`Unknown payment provider: ${providerType}`);
    }
  }
}
