import { Module } from '@nestjs/common';
import { AgencyController } from './agency.controller';
import { DatabaseModule } from '../database/database.module';
import { ExternalPaymentsModule } from '../external-payments/external-payments.module';

import { AgencyPublicController } from './agency-public.controller';

@Module({
    imports: [DatabaseModule, ExternalPaymentsModule],
    controllers: [AgencyController, AgencyPublicController],
})
export class AgencyModule { }
