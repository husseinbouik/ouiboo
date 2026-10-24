import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ReviewsService } from './reviews.service';
import { ReviewsController, TripsReviewsController, ReviewDetailController, AdminReviewsController } from './reviews.controller';

@Module({
  imports: [DatabaseModule],
  providers: [ReviewsService],
  controllers: [ReviewsController, TripsReviewsController, ReviewDetailController, AdminReviewsController],
  exports: [ReviewsService],
})
export class ReviewsModule {}
