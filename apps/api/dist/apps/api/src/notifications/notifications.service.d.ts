import { DatabaseService } from '../database/database.service';
import { NotificationPreferenceDto } from './dto/notification-preference.dto';
export declare class NotificationsService {
    private prisma;
    constructor(prisma: DatabaseService);
    getPreferences(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        paymentReminder: boolean;
        tripReminder: boolean;
        bookingConfirmation: boolean;
        cancellationAlert: boolean;
        reviewRequest: boolean;
        smsNotifications: boolean;
        emailNotifications: boolean;
    }>;
    updatePreferences(userId: string, dto: NotificationPreferenceDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        paymentReminder: boolean;
        tripReminder: boolean;
        bookingConfirmation: boolean;
        cancellationAlert: boolean;
        reviewRequest: boolean;
        smsNotifications: boolean;
        emailNotifications: boolean;
    }>;
    getNotificationHistory(userId: string, limit?: number): Promise<{
        message: string;
        subject: string | null;
        id: string;
        userId: string;
        status: string;
        metadata: import("../../../../packages/database/generated-client/runtime/library").JsonValue | null;
        notificationType: import("@ouiboo/database").$Enums.NotificationType;
        recipientEmail: string;
        sentAt: Date;
        failureReason: string | null;
    }[]>;
    getUnreadNotificationCount(userId: string): Promise<number>;
}
