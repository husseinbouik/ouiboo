import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [DatabaseModule, CommonModule],
    controllers: [HealthController],
})
export class HealthModule { }
