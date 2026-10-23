import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminSeedService } from './admin-seed.service';
import { AuditLogService } from './audit-log.service';
import { DatabaseModule } from '../database/database.module';
import { ExternalPaymentsModule } from '../external-payments/external-payments.module';
import { StagedPaymentsModule } from '../staged-payments/staged-payments.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [DatabaseModule, ExternalPaymentsModule, StagedPaymentsModule, PaymentsModule],
    controllers: [AdminController],
    providers: [AdminSeedService, AuditLogService],
})
export class AdminModule { }
