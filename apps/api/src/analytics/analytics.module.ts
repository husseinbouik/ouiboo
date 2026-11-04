import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AnalyticsService } from './analytics.service';
import { BetaMetricsService } from './beta-metrics.service';
import { FunnelMetricsService } from './funnel-metrics.service';
import { LeakageDetectionService } from './leakage-detection.service';
import { AnalyticsController, AdminAnalyticsController } from './analytics.controller';

@Module({
  imports: [DatabaseModule],
  providers: [AnalyticsService, BetaMetricsService, LeakageDetectionService, FunnelMetricsService],
  controllers: [AnalyticsController, AdminAnalyticsController],
  exports: [AnalyticsService, BetaMetricsService, LeakageDetectionService, FunnelMetricsService],
})
export class AnalyticsModule {}
