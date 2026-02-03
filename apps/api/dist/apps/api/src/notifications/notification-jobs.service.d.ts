import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
export declare class NotificationJobsService {
    private prisma;
    private emailService;
    private readonly logger;
    constructor(prisma: DatabaseService, emailService: EmailService);
    sendPaymentProofReminders(): Promise<void>;
    sendTripReminders7DaysBefore(): Promise<void>;
    sendTripReminders1DayBefore(): Promise<void>;
    autoCancelUnpaidBookings(): Promise<void>;
    private createNotificationLog;
}
