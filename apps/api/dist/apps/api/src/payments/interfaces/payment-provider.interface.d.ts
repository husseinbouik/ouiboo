export interface PaymentSession {
    sessionId: string;
    redirectUrl: string;
    expiresAt: Date;
    metadata?: Record<string, any>;
}
export interface PaymentVerificationResult {
    status: 'success' | 'failure' | 'pending';
    transactionId?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
}
export interface PaymentProvider {
    initiatePayment(amount: number, bookingId: string, travelerEmail: string, travelerName: string): Promise<PaymentSession>;
    verifyPayment(transactionId: string, bookingId: string): Promise<PaymentVerificationResult>;
    processRefund(transactionId: string, amount: number): Promise<{
        success: boolean;
        refundId?: string;
        error?: string;
    }>;
    validateWebhookSignature(payload: string, signature: string): boolean;
}
