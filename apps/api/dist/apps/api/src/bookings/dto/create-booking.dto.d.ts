export declare enum PaymentMethodEnum {
    BANK_TRANSFER = "BANK_TRANSFER",
    CARD = "CARD",
    WALLET = "WALLET",
    MOBILE_MONEY = "MOBILE_MONEY"
}
export declare class CreateBookingDto {
    sessionId: string;
    guestsCount: number;
    fullName: string;
    phoneNumber: string;
    documentNumber: string;
    paymentMethod?: PaymentMethodEnum;
}
