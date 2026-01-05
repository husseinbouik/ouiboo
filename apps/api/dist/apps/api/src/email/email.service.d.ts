export declare class EmailService {
    private transporter;
    private readonly logger;
    constructor();
    sendMail(to: string, subject: string, html: string): Promise<any>;
    getWelcomeTemplate(name: string): string;
    getOTPTemplate(otp: string): string;
    getBookingConfirmationTemplate(userName: string, tripTitle: string, date: string): string;
}
