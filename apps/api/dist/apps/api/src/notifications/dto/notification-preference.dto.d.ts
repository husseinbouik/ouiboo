export declare class NotificationPreferenceDto {
    paymentReminder?: boolean;
    tripReminder?: boolean;
    bookingConfirmation?: boolean;
    cancellationAlert?: boolean;
    reviewRequest?: boolean;
    smsNotifications?: boolean;
    emailNotifications?: boolean;
}
export declare class SendNotificationDto {
    recipientEmail: string;
    notificationType: string;
    subject: string;
    message: string;
    metadata?: Record<string, any>;
}
