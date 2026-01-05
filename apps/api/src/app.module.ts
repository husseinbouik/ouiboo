import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
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
        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'uploads'),
            serveRoot: '/uploads',
        }),
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
