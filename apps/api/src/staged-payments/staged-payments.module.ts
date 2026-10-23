import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ExternalPaymentsModule } from '../external-payments/external-payments.module';
import { RefundsModule } from '../refunds/refunds.module';
import { StagedPaymentsService } from './staged-payments.service';

@Module({
    imports: [DatabaseModule, ExternalPaymentsModule, RefundsModule],
    providers: [StagedPaymentsService],
    exports: [StagedPaymentsService],
})
export class StagedPaymentsModule { }
