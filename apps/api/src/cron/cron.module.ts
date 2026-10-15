import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CurrencyModule } from '../currency/currency.module';
import { CronController } from './cron.controller';

/**
 * Serverless cron module (#216).
 * Exposes maintenance jobs as an HTTP endpoint for Vercel Cron,
 * replacing the BullMQ worker process (worker.ts) which cannot run
 * on Vercel serverless functions.
 */
@Module({
  imports: [NotificationsModule, CurrencyModule],
  controllers: [CronController],
})
export class CronModule {}
