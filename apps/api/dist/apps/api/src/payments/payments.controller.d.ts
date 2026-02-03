import { RawBodyRequest } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto, VerifyPaymentDto, ProcessRefundDto } from './dto/payment.dto';
import { Request } from 'express';
export declare class PaymentsController {
    private paymentsService;
    private readonly logger;
    constructor(paymentsService: PaymentsService);
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
    handleWebhook(provider: string, req: RawBodyRequest<Request>, headers: Record<string, string>): Promise<{
        received: boolean;
        processed: boolean;
    }>;
}
