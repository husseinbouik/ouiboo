import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CurrencyModule } from '../currency/currency.module';
import { StagedPaymentsModule } from '../staged-payments/staged-payments.module';
import { RefundsModule } from '../refunds/refunds.module';
import { PaymentProvidersModule } from '../payment-providers/payment-providers.module';
import { CronController } from './cron.controller';

/**
 * Serverless cron module (#216).
 * Exposes maintenance jobs as an HTTP endpoint for Vercel Cron,
 * replacing the BullMQ worker process (worker.ts) which cannot run
 * on Vercel serverless functions.
 */
@Module({
  imports: [NotificationsModule, CurrencyModule, StagedPaymentsModule, RefundsModule, PaymentProvidersModule],
  controllers: [CronController],
})
export class CronModule {}
