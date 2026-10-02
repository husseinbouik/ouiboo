import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminSeedService } from './admin-seed.service';
import { AuditLogService } from './audit-log.service';
import { DatabaseModule } from '../database/database.module';
import { WalletsModule } from '../wallets/wallets.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [DatabaseModule, WalletsModule, PaymentsModule],
    controllers: [AdminController],
    providers: [AdminSeedService, AuditLogService],
})
export class AdminModule { }
