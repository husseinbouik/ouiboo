import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AnalyticsService } from './analytics.service';
import { BetaMetricsService } from './beta-metrics.service';
import { AnalyticsController, AdminAnalyticsController } from './analytics.controller';

@Module({
  imports: [DatabaseModule],
  providers: [AnalyticsService, BetaMetricsService],
  controllers: [AnalyticsController, AdminAnalyticsController],
  exports: [AnalyticsService, BetaMetricsService],
})
export class AnalyticsModule {}
