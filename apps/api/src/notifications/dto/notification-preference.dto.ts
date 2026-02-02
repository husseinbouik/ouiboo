import { IsBoolean, IsEmail } from 'class-validator';

export class NotificationPreferenceDto {
  @IsBoolean()
  paymentReminder?: boolean;

  @IsBoolean()
  tripReminder?: boolean;

  @IsBoolean()
  bookingConfirmation?: boolean;

  @IsBoolean()
  cancellationAlert?: boolean;

  @IsBoolean()
  reviewRequest?: boolean;

  @IsBoolean()
  smsNotifications?: boolean;

  @IsBoolean()
  emailNotifications?: boolean;
}

export class SendNotificationDto {
  @IsEmail()
  recipientEmail: string;

  notificationType: string;

  subject: string;

  message: string;

  metadata?: Record<string, any>;
}
