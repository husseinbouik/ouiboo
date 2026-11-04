import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UploadModule } from '../upload/upload.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewsService } from './reviews.service';
import { ReviewsController, TripsReviewsController, ReviewDetailController, AdminReviewsController } from './reviews.controller';

@Module({
  // #776: UploadModule supplies UploadService so the review-photo
  // endpoint can stream private-storage files under the visibility gate.
  // #784: NotificationsModule supplies PushNotificationsService for the
  // review-response push channel.
  imports: [DatabaseModule, UploadModule, NotificationsModule],
  providers: [ReviewsService],
  controllers: [ReviewsController, TripsReviewsController, ReviewDetailController, AdminReviewsController],
  exports: [ReviewsService],
})
export class ReviewsModule {}
