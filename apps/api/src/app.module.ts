import { Module } from '@nestjs/common'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { AdminModule } from './admin/admin.module'
import { AgencyModule } from './agency/agency.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { AuthModule } from './auth/auth.module'
import { BookingsModule } from './bookings/bookings.module'
import { CommonModule } from './common/common.module'
import { CurrencyModule } from './currency/currency.module'
import { DatabaseModule } from './database/database.module'
import { EmailModule } from './email/email.module'
import { HealthModule } from './health/health.module'
import { MessagesModule } from './messages/messages.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PaymentsModule } from './payments/payments.module'
import { ReviewsModule } from './reviews/reviews.module'
import { TripsModule } from './trips/trips.module'
import { UploadModule } from './upload/upload.module'
import { UsersModule } from './users/users.module'
import { WalletsModule } from './wallets/wallets.module'
import { WishlistModule } from './wishlist/wishlist.module'

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    CommonModule,
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
    PaymentsModule,
    NotificationsModule,
    ReviewsModule,
    WishlistModule,
    AnalyticsModule,
    CurrencyModule,
    MessagesModule,
  ],
})
export class AppModule {}
