import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { ExternalPaymentsModule } from '../external-payments/external-payments.module';
import { RefundsService } from './refunds.service';
import { TravelerRefundsController } from './traveler-refunds.controller';
import { AgencyRefundsController } from './agency-refunds.controller';
import { AdminRefundsController } from './admin-refunds.controller';

@Module({
    // EmailModule is @Global in the full app, but importing it explicitly
    // keeps this module resolvable in partial testing graphs (e.g. the
    // payment-records e2e imports StagedPaymentsModule -> RefundsModule
    // without AppModule).
    imports: [DatabaseModule, ExternalPaymentsModule, EmailModule],
    controllers: [
        TravelerRefundsController,
        AgencyRefundsController,
        AdminRefundsController,
    ],
    providers: [RefundsService],
    exports: [RefundsService],
})
export class RefundsModule { }
