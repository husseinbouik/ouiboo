import { Module } from '@nestjs/common';
import { ExternalPaymentsService } from './external-payments.service';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule],
    providers: [ExternalPaymentsService],
    exports: [ExternalPaymentsService],
})
export class ExternalPaymentsModule { }
