import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { TripsModule } from './trips/trips.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { UploadModule } from './upload/upload.module';
import { BookingsModule } from './bookings/bookings.module';
import { AgencyModule } from './agency/agency.module';
import { AdminModule } from './admin/admin.module';
import { WalletsModule } from './wallets/wallets.module';
import { EmailModule } from './email/email.module';

@Module({
    imports: [
        DatabaseModule,
        AuthModule,
        TripsModule,
        UsersModule,
        UploadModule,
        BookingsModule,
        AgencyModule,
        AdminModule,
        WalletsModule,
        EmailModule,
    ],
})
export class AppModule { }
