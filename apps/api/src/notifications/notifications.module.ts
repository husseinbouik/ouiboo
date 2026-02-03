import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { NotificationsService } from './notifications.service';
import { NotificationJobsService } from './notification-jobs.service';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot(), EmailModule],
  providers: [NotificationsService, NotificationJobsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
