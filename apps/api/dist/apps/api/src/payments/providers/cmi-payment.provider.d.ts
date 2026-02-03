import { PaymentSession, PaymentVerificationResult, PaymentProvider } from '../interfaces/payment-provider.interface';
export declare class CMIPaymentProvider implements PaymentProvider {
    private merchantId;
    private apiKey;
    private baseUrl;
    private callbackUrl;
    private http;
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
    private callCMIAPI;
}
