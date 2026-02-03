import { PaymentSession, PaymentVerificationResult, PaymentProvider } from '../interfaces/payment-provider.interface';
export declare class StripePaymentProvider implements PaymentProvider {
    private stripe;
    private publishableKey;
    private callbackUrl;
    private readonly logger;
    constructor();
    initiatePayment(amount: number, bookingId: string, travelerEmail: string, travelerName: string): Promise<PaymentSession>;
    verifyPayment(transactionId: string, bookingId: string): Promise<PaymentVerificationResult>;
    processRefund(transactionId: string, amount: number): Promise<{
        success: boolean;
        refundId?: string;
        error?: string;
    }>;
    validateWebhookSignature(payload: string, signature: string): boolean;
}
