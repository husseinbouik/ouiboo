import { IsBoolean, IsEmail, IsOptional } from 'class-validator';

export class NotificationPreferenceDto {
  @IsOptional()
  @IsBoolean()
  paymentReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  tripReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  bookingConfirmation?: boolean;

  @IsOptional()
  @IsBoolean()
  cancellationAlert?: boolean;

  @IsOptional()
  @IsBoolean()
  reviewRequest?: boolean;

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  // #784: web push channel switch (opt-in; subscribing turns it on,
  // the user can turn it off here without losing subscriptions).
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;
}

export class SendNotificationDto {
  @IsEmail()
  recipientEmail!: string;

  notificationType!: string;

  subject!: string;

  message!: string;

  metadata?: Record<string, any>;
}
