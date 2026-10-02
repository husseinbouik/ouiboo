import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateReviewDto, UpdateReviewDto, ReviewResponseDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: DatabaseService) {}

  /**
   * Create a review for a completed booking
   */
  async createReview(
    bookingId: string,
    travelerId: string,
    dto: CreateReviewDto,
  ) {
    // Verify booking exists and belongs to traveler
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { session: { include: { template: true } } },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (booking.travelerId !== travelerId) {
      throw new ForbiddenException('Not authorized to review this booking');
    }

    // Verify booking is completed
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Can only review completed bookings',
      );
    }

    // Check if review already exists
    const existingReview = await this.prisma.review.findUnique({
      where: { bookingId },
    });

    if (existingReview) {
      throw new BadRequestException('Review already exists for this booking');
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        bookingId,
        travelerId,
        tripTemplateId: booking.session.template.id,
        rating: dto.rating,
        comment: dto.comment,
        isVerifiedBooking: true,
      },
    });

    // Update trip template rating
    await this.updateTripRating(booking.session.template.id);

    return review;
  }

  /**
   * Get reviews for a trip
   */
  async getReviewsByTrip(tripId: string, page: number = 1, limit: number = 10, sortBy: string = 'recent') {
    const normalizedPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    const normalizedLimit = Number.isFinite(limit)
      ? Math.min(50, Math.max(1, Math.floor(limit)))
      : 10;
    const skip = (normalizedPage - 1) * normalizedLimit;

    // Determine sort order based on sortBy parameter
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'highest') {
      orderBy = { rating: 'desc' };
    } else if (sortBy === 'lowest') {
      orderBy = { rating: 'asc' };
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { tripTemplateId: tripId },
        include: { traveler: { select: { id: true, name: true, avatar: true } } },
        orderBy,
        skip,
        take: normalizedLimit,
      }),
      this.prisma.review.count({
        where: { tripTemplateId: tripId },
      }),
    ]);

    return {
      reviews,
      total,
      page: normalizedPage,
      pages: Math.ceil(total / normalizedLimit),
    };
  }

  /**
   * Get review statistics for a trip
   */
  async getReviewStats(tripId: string) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const where = { tripTemplateId: tripId };
    const [aggregate, groupedRatings] = await Promise.all([
      this.prisma.review.aggregate({
        where,
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where,
        _count: { _all: true },
      }),
    ]);

    for (const group of groupedRatings) {
      if (group.rating >= 1 && group.rating <= 5) {
        distribution[group.rating] = group._count._all;
      }
    }

    return {
      averageRating: Math.round((aggregate._avg.rating || 0) * 10) / 10,
      totalReviews: aggregate._count._all,
      distribution,
    };
  }

  /**
   * Add response to review (by agency)
   */
  async respondToReview(
    reviewId: string,
    agencyId: string,
    dto: ReviewResponseDto,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { booking: { include: { session: { include: { template: true } } } } },
    });

    if (!review) {
      throw new BadRequestException('Review not found');
    }

    // Verify agency owns the trip
    if (review.booking.session.template.agencyId !== agencyId) {
      throw new ForbiddenException(
        'Not authorized to respond to this review',
      );
    }

    const updatedReview = await this.prisma.review.update({
      where: { id: reviewId },
      data: { response: dto.response },
    });

    return updatedReview;
  }

  /**
   * Update review by author
   */
  async updateReview(
    reviewId: string,
    travelerId: string,
    dto: UpdateReviewDto,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { booking: { include: { session: { include: { template: true } } } } },
    });

    if (!review) {
      throw new BadRequestException('Review not found');
    }

    if (review.travelerId !== travelerId) {
      throw new ForbiddenException('Not authorized to update this review');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating ?? review.rating,
        comment: dto.comment ?? review.comment,
      },
    });

    // Update trip rating
    await this.updateTripRating(review.booking.session.template.id);

    return updatedReview;
  }

  /**
   * Delete review
   */
  async deleteReview(reviewId: string, userId: string, userRole: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { booking: { include: { session: { include: { template: true } } } } },
    });

    if (!review) {
      throw new BadRequestException('Review not found');
    }

    // Only author or admin can delete
    if (
      review.travelerId !== userId &&
      userRole !== 'ADMIN'
    ) {
      throw new ForbiddenException('Not authorized to delete this review');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    // Update trip rating
    await this.updateTripRating(review.booking.session.template.id);
  }

  /**
   * Moderate review (admin only)
   */
  async moderateReview(reviewId: string, action: 'approve' | 'reject') {
    // TODO: Implement review moderation logic
    // For now, we'll just return the review
    void action;
    return this.prisma.review.findUnique({
      where: { id: reviewId },
    });
  }

  /**
   * Update trip average rating
   */
  private async updateTripRating(tripId: string) {
    const stats = await this.getReviewStats(tripId);

    await this.prisma.tripTemplate.update({
      where: { id: tripId },
      data: {
        averageRating: stats.averageRating,
        reviewCount: stats.totalReviews,
        lastReviewDate: new Date(),
      },
    });
  }
}
