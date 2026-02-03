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
import { HealthModule } from './health/health.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CurrencyModule } from './currency/currency.module';
// import { WebSocketModule } from './websocket/websocket.module';
import { MessagesModule } from './messages/messages.module';

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
        HealthModule,
        // Phase 1 & 2 Features
        PaymentsModule,
        NotificationsModule,
        ReviewsModule,
        WishlistModule,
        AnalyticsModule,
        CurrencyModule,
        // WebSocketModule,
        MessagesModule,
    ],
})
export class AppModule { }
