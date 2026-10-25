import { Module } from '@nestjs/common';
import { AgencyController } from './agency.controller';
import { AgencyComplianceService } from './agency-compliance.service';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { ExternalPaymentsModule } from '../external-payments/external-payments.module';

import { AgencyPublicController } from './agency-public.controller';

@Module({
    // EmailModule is @Global in the full app; importing it explicitly
    // keeps this module resolvable in partial testing graphs (same
    // pattern as RefundsModule).
    imports: [DatabaseModule, ExternalPaymentsModule, EmailModule],
    controllers: [AgencyController, AgencyPublicController],
    providers: [AgencyComplianceService],
    exports: [AgencyComplianceService],
})
export class AgencyModule { }
