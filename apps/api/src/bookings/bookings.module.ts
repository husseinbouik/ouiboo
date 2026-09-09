import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { UploadModule } from '../upload/upload.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
    imports: [UploadModule, WalletsModule],
    controllers: [BookingsController],
    providers: [BookingsService],
})
export class BookingsModule { }
