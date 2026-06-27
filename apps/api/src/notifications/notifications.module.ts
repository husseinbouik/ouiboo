import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { NotificationsService } from './notifications.service';
import { NotificationJobsService } from './notification-jobs.service';

@Module({
  imports: [DatabaseModule, EmailModule],
  providers: [NotificationsService, NotificationJobsService],
  exports: [NotificationsService, NotificationJobsService],
})
export class NotificationsModule {}
