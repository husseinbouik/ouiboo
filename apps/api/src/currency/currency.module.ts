// Currency module export
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../database/database.module';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  providers: [CurrencyService],
  controllers: [CurrencyController],
  exports: [CurrencyService],
})
export class CurrencyModule {}
