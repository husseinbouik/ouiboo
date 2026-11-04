import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsService } from './notifications.service';
import { NotificationJobsService } from './notification-jobs.service';
import { NotificationsController } from './notifications.controller';
import { PushNotificationsService } from './push-notifications.service';
import { PUSH_SENDER, WebPushSender } from './push-sender';

@Module({
  imports: [DatabaseModule, EmailModule, MessagingModule],
  providers: [
    NotificationsService,
    NotificationJobsService,
    PushNotificationsService,
    { provide: PUSH_SENDER, useClass: WebPushSender },
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService, NotificationJobsService, PushNotificationsService],
})
export class NotificationsModule {}
