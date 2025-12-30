import { Module } from '@nestjs/common';
import { AgencyController } from './agency.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [AgencyController],
})
export class AgencyModule { }
