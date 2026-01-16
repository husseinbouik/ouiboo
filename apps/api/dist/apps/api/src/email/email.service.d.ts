export declare class EmailService {
    private transporter;
    private readonly logger;
    constructor();
    sendEmail(to: string, subject: string, html: string): Promise<void>;
    sendMail(to: string, subject: string, html: string): Promise<void>;
    getOTPTemplate(otp: string): string;
    getWelcomeTemplate(name?: string | null): string;
    sendBookingNotification(travelerEmail: string, agencyEmail: string, bookingId: string, tripTitle: string): Promise<void>;
    sendPaymentConfirmation(travelerEmail: string, tripTitle: string): Promise<void>;
}
