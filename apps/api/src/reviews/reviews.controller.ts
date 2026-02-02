import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, ReviewResponseDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  /**
   * Create a review for a booking
   */
  @Post(':bookingId/review')
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @Param('bookingId') bookingId: string,
    @Body() dto: CreateReviewDto,
    @Request() req: any,
  ) {
    return this.reviewsService.createReview(bookingId, req.user.id, dto);
  }
}

@Controller('trips')
export class TripsReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  /**
   * Get reviews for a trip
   */
  @Get(':tripId/reviews')
  async getReviews(
    @Param('tripId') tripId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.reviewsService.getReviewsByTrip(
      tripId,
      parseInt(page),
      parseInt(limit),
    );
  }

  /**
   * Get review statistics for a trip
   */
  @Get(':tripId/reviews/stats')
  async getReviewStats(@Param('tripId') tripId: string) {
    return this.reviewsService.getReviewStats(tripId);
  }
}

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewDetailController {
  constructor(private reviewsService: ReviewsService) {}

  /**
   * Add response to review (agencies only)
   */
  @Post(':reviewId/response')
  @HttpCode(HttpStatus.OK)
  async respondToReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: ReviewResponseDto,
    @Request() req: any,
  ) {
    return this.reviewsService.respondToReview(reviewId, req.user.agencyId, dto);
  }

  /**
   * Update review by author
   */
  @Patch(':reviewId')
  async updateReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
    @Request() req: any,
  ) {
    return this.reviewsService.updateReview(reviewId, req.user.id, dto);
  }

  /**
   * Delete review
   */
  @Delete(':reviewId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(
    @Param('reviewId') reviewId: string,
    @Request() req: any,
  ) {
    return this.reviewsService.deleteReview(reviewId, req.user.id, req.user.role);
  }
}
