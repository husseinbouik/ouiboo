import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ReviewsService } from './reviews.service';
import { ReviewsController, TripsReviewsController, ReviewDetailController } from './reviews.controller';

@Module({
  imports: [DatabaseModule],
  providers: [ReviewsService],
  controllers: [ReviewsController, TripsReviewsController, ReviewDetailController],
  exports: [ReviewsService],
})
export class ReviewsModule {}
