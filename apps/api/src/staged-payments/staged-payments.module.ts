import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ExternalPaymentsModule } from '../external-payments/external-payments.module';
import { StagedPaymentsService } from './staged-payments.service';

@Module({
    imports: [DatabaseModule, ExternalPaymentsModule],
    providers: [StagedPaymentsService],
    exports: [StagedPaymentsService],
})
export class StagedPaymentsModule { }
