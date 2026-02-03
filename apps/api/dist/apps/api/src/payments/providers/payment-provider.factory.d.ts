import { PaymentProvider } from '../interfaces/payment-provider.interface';
import { CMIPaymentProvider } from './cmi-payment.provider';
import { StripePaymentProvider } from './stripe-payment.provider';
import { CashPlusPaymentProvider } from './cashplus-payment.provider';
export type PaymentProviderType = 'CMI' | 'STRIPE' | 'CASHPLUS';
export declare class PaymentProviderFactory {
    private cmiProvider;
    private stripeProvider;
    private cashplusProvider;
    constructor(cmiProvider: CMIPaymentProvider, stripeProvider: StripePaymentProvider, cashplusProvider: CashPlusPaymentProvider);
    getProvider(providerType: PaymentProviderType): PaymentProvider;
}
