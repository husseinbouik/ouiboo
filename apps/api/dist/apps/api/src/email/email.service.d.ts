export declare class EmailService {
    private transporter;
    private readonly logger;
    constructor();
    sendEmail(to: string, subject: string, html: string): Promise<void>;
    sendMail(to: string, subject: string, html: string): Promise<void>;
    getOTPTemplate(otp: string): string;
    getWelcomeTemplate(name?: string | null): string;
    sendOTP(to: string, otp: string): Promise<void>;
    generateOTPSubject(): string;
    sendWelcomeEmail(to: string, name?: string | null): Promise<void>;
    getPasswordResetTemplate(resetUrl: string): string;
    sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>;
    sendBookingNotification(travelerEmail: string, agencyEmail: string, bookingId: string, tripTitle: string): Promise<void>;
    sendPaymentConfirmation(travelerEmail: string, tripTitle: string): Promise<void>;
    getPaymentReminderTemplate(tripTitle: string, daysUntilPaymentDue: number, bookingDashboardUrl: string): string;
    sendPaymentReminder(travelerEmail: string, tripTitle: string, daysUntilPaymentDue: number, bookingDashboardUrl: string): Promise<void>;
    getTripReminderTemplate(tripTitle: string, daysUntilTrip: number, agencyName: string, tripDetailsUrl: string): string;
    sendTripReminder(travelerEmail: string, tripTitle: string, daysUntilTrip: number, agencyName: string, tripDetailsUrl: string): Promise<void>;
    getReviewRequestTemplate(tripTitle: string, agencyName: string, reviewUrl: string): string;
    sendReviewRequest(travelerEmail: string, tripTitle: string, agencyName: string, reviewUrl: string): Promise<void>;
    getAutoUnpaidCancellationTemplate(tripTitle: string, bookingId: string): string;
    sendAutoUnpaidCancellationNotice(travelerEmail: string, tripTitle: string, bookingId: string): Promise<void>;
}
