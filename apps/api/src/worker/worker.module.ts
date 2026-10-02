import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CurrencyModule } from '../currency/currency.module';
import { getRedisConnectionOptions } from './redis-connection';
import { MAINTENANCE_QUEUE } from './worker-queue.constants';
import { MaintenanceProcessor } from './maintenance.processor';
import { MaintenanceSchedulerService } from './maintenance-scheduler.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: getRedisConnectionOptions(),
    }),
    BullModule.registerQueue({
      name: MAINTENANCE_QUEUE,
    }),
    DatabaseModule,
    EmailModule,
    NotificationsModule,
    CurrencyModule,
  ],
  providers: [MaintenanceProcessor, MaintenanceSchedulerService],
})
export class WorkerModule {}
