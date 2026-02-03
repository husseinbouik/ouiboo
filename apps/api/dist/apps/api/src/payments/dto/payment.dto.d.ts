export declare class InitiatePaymentDto {
    bookingId: string;
    amount: number;
    travelerEmail: string;
    travelerName: string;
    provider: string;
}
export declare class VerifyPaymentDto {
    transactionId: string;
    bookingId: string;
    provider: string;
}
export declare class ProcessRefundDto {
    bookingId: string;
    transactionId: string;
    amount: number;
    provider: string;
}
