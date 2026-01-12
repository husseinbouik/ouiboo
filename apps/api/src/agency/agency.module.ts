import { Module } from '@nestjs/common';
import { AgencyController } from './agency.controller';
import { DatabaseModule } from '../database/database.module';

import { AgencyPublicController } from './agency-public.controller';

@Module({
    imports: [DatabaseModule],
    controllers: [AgencyController, AgencyPublicController],
})
export class AgencyModule { }
