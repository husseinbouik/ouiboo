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
  NotFoundException,
  Res,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { UploadService } from '../upload/upload.service';
import type { Response } from 'express';
import { CreateReviewDto, UpdateReviewDto, ReviewResponseDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@ouiboo/types';

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
  constructor(
    private reviewsService: ReviewsService,
    private uploadService: UploadService,
  ) {}

  /**
   * Get reviews for a trip
   */
  @Get(':tripId/reviews')
  async getReviews(
    @Param('tripId') tripId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('sortBy') sortBy: string = 'recent',
  ) {
    return this.reviewsService.getReviewsByTrip(
      tripId,
      parseInt(page),
      parseInt(limit),
      sortBy,
    );
  }

  /**
   * Get review statistics for a trip
   */
  @Get(':tripId/reviews/stats')
  async getReviewStats(@Param('tripId') tripId: string) {
    return this.reviewsService.getReviewStats(tripId);
  }

  /**
   * #776: serve one traveller photo of a review. The file lives in
   * PRIVATE storage and is streamed here ONLY while its review is
   * VISIBLE — the service resolves the key under that gate and throws
   * 404 otherwise, so an unmoderated (PENDING) photo is not publicly
   * fetchable through this route, the media endpoint, or anywhere
   * else. Owners/admins can always use the signed-URL endpoint.
   */
  @Get(':tripId/reviews/:reviewId/photos/:index')
  async getReviewPhoto(
    @Param('tripId') tripId: string,
    @Param('reviewId') reviewId: string,
    @Param('index') index: string,
    @Res() res: Response,
  ) {
    const key = await this.reviewsService.getVisibleReviewPhotoKey(
      tripId,
      reviewId,
      parseInt(index, 10),
    );
    let file: { data: Buffer; contentType: string };
    try {
      file = await this.uploadService.readFile(key);
    } catch {
      throw new NotFoundException('Review photo not found');
    }
    res.set({
      'Content-Type': file.contentType,
      'Content-Length': file.data.length.toString(),
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(file.data);
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
  @UseGuards(RolesGuard)
  @Roles(UserRole.Agency)
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

/**
 * Admin review moderation (#393) — POST /admin/reviews/:id/moderate.
 * Guarded exactly like the rest of the admin surface: a valid JWT plus
 * the ADMIN role. Travelers and agencies receive 403 from RolesGuard.
 */
@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  /**
   * #776: moderation detail — the full review including sub-scores
   * and photo keys, so a moderator inspects everything before acting
   * (photos themselves are fetched via the signed-URL endpoint,
   * which already permits admins).
   */
  @Get(':id')
  async getReviewForModeration(@Param('id') reviewId: string) {
    return this.reviewsService.getReviewForModeration(reviewId);
  }

  @Post(':id/moderate')
  @HttpCode(HttpStatus.OK)
  async moderateReview(
    @Param('id') reviewId: string,
    @Body() dto: ModerateReviewDto,
    @Request() req: any,
  ) {
    return this.reviewsService.moderateReview(
      reviewId,
      { id: req.user.id ?? req.user.userId, email: req.user.email },
      dto.action,
      dto.reason,
    );
  }

  /**
   * #692: moderate the agency REPLY on a review — same lifecycle,
   * same guard, same DTO as review moderation.
   */
  @Post(':id/response/moderate')
  @HttpCode(HttpStatus.OK)
  async moderateReviewResponse(
    @Param('id') reviewId: string,
    @Body() dto: ModerateReviewDto,
    @Request() req: any,
  ) {
    return this.reviewsService.moderateReviewResponse(
      reviewId,
      { id: req.user.id ?? req.user.userId, email: req.user.email },
      dto.action,
      dto.reason,
    );
  }
}
