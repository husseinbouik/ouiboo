import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController, AdminAnalyticsController } from './analytics.controller';

@Module({
  imports: [DatabaseModule],
  providers: [AnalyticsService],
  controllers: [AnalyticsController, AdminAnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
