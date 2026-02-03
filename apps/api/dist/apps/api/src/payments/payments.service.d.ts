import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { InitiatePaymentDto, VerifyPaymentDto, ProcessRefundDto } from './dto/payment.dto';
export declare class PaymentsService {
    private prisma;
    private paymentProviderFactory;
    private emailService;
    private readonly logger;
    constructor(prisma: DatabaseService, paymentProviderFactory: PaymentProviderFactory, emailService: EmailService);
    initiatePayment(dto: InitiatePaymentDto): Promise<{
        redirectUrl: string;
        sessionId: string;
        expiresAt: Date;
    }>;
    verifyPayment(dto: VerifyPaymentDto): Promise<import("./interfaces/payment-provider.interface").PaymentVerificationResult>;
    processRefund(dto: ProcessRefundDto): Promise<{
        success: boolean;
        refundId?: string;
        error?: string;
    }>;
    handleWebhookCallback(provider: string, payload: string, signature: string): Promise<{
        received: boolean;
        processed: boolean;
    }>;
    private handleStripeWebhook;
    private handleStripePaymentSuccess;
    private handleStripePaymentFailed;
    private handleStripeRefund;
    private handleStripePaymentIntentSuccess;
    private handleCMIWebhook;
    private handleCMIPaymentSuccess;
    private handleCMIPaymentFailed;
    private handleCMIRefund;
    private handleCashPlusWebhook;
    private handleCashPlusPaymentSuccess;
    private handleCashPlusPaymentFailed;
    private transitionBookingToConfirmed;
}
