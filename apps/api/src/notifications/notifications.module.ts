import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { NotificationsService } from './notifications.service';
import { NotificationJobsService } from './notification-jobs.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [DatabaseModule, EmailModule],
  providers: [NotificationsService, NotificationJobsService],
  controllers: [NotificationsController],
  exports: [NotificationsService, NotificationJobsService],
})
export class NotificationsModule {}
