import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminInterventionsController } from './admin-interventions.controller';
import { AdminInterventionsService } from './admin-interventions.service';
import { AdminSeedService } from './admin-seed.service';
import { AuditLogService } from './audit-log.service';
import { DatabaseModule } from '../database/database.module';
import { ExternalPaymentsModule } from '../external-payments/external-payments.module';
import { RefundsModule } from '../refunds/refunds.module';
import { StagedPaymentsModule } from '../staged-payments/staged-payments.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [DatabaseModule, ExternalPaymentsModule, StagedPaymentsModule, RefundsModule, PaymentsModule],
    controllers: [AdminController, AdminInterventionsController],
    providers: [AdminSeedService, AuditLogService, AdminInterventionsService],
})
export class AdminModule { }
