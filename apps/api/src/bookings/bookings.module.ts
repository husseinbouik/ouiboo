import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { RebookingService } from './rebooking.service';
import { BookingsController } from './bookings.controller';
import { UploadModule } from '../upload/upload.module';
import { ExternalPaymentsModule } from '../external-payments/external-payments.module';
import { StagedPaymentsModule } from '../staged-payments/staged-payments.module';

@Module({
    imports: [UploadModule, ExternalPaymentsModule, StagedPaymentsModule],
    controllers: [BookingsController],
    providers: [BookingsService, RebookingService],
})
export class BookingsModule { }
