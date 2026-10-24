import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateReviewDto, UpdateReviewDto, ReviewResponseDto } from './dto/create-review.dto';

export type ReviewStatusValue = 'VISIBLE' | 'HIDDEN' | 'REMOVED';
export type ReviewModerationAction = 'HIDE' | 'REMOVE' | 'RESTORE';

const MODERATION_TARGETS: Record<ReviewModerationAction, ReviewStatusValue> = {
  HIDE: 'HIDDEN',
  REMOVE: 'REMOVED',
  RESTORE: 'VISIBLE',
};

/** Allowed status transitions. REMOVED is terminal. */
const MODERATION_TRANSITIONS: Record<ReviewStatusValue, ReviewStatusValue[]> = {
  VISIBLE: ['HIDDEN', 'REMOVED'],
  HIDDEN: ['VISIBLE', 'REMOVED'],
  REMOVED: [],
};

function normalizeModerationAction(
  action: ReviewModerationAction | 'approve' | 'reject',
): ReviewModerationAction {
  switch (action) {
    case 'HIDE':
    case 'REMOVE':
    case 'RESTORE':
      return action;
    case 'approve':
      return 'RESTORE';
    case 'reject':
      return 'REMOVE';
    default:
      throw new BadRequestException(`Invalid moderation action: ${String(action)}`);
  }
}

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
        where: { tripTemplateId: tripId, status: 'VISIBLE' },
        include: { traveler: { select: { id: true, name: true, avatar: true } } },
        orderBy,
        skip,
        take: normalizedLimit,
      }),
      this.prisma.review.count({
        where: { tripTemplateId: tripId, status: 'VISIBLE' },
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
    const where = { tripTemplateId: tripId, status: 'VISIBLE' as const };
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
   * Moderate review (admin only) — #393.
   *
   * Lifecycle: reviews start VISIBLE (the pre-moderation behaviour, so
   * existing rows keep showing). An admin may HIDE a VISIBLE review,
   * REMOVE a VISIBLE or HIDDEN review, or RESTORE a HIDDEN review back
   * to VISIBLE. REMOVED is terminal: a removed review cannot be
   * restored through this endpoint (its content is retained in the
   * database for audit purposes only). Legacy action names from the
   * original stub are still accepted: 'approve' = restore to VISIBLE,
   * 'reject' = REMOVED.
   *
   * Every action stamps moderatedById / moderatedAt / moderationReason
   * on the review and writes an AuditLog row (action REVIEW_MODERATED)
   * so the decision is attributable after the fact. HIDE and REMOVE
   * require a reason. Public lists and rating aggregates only count
   * VISIBLE reviews, and the trip's stored rating is recalculated after
   * each moderation action.
   */
  async moderateReview(
    reviewId: string,
    actor: { id?: string; userId?: string; email?: string },
    action: ReviewModerationAction | 'approve' | 'reject',
    reason?: string,
  ) {
    const normalizedAction = normalizeModerationAction(action);
    const targetStatus = MODERATION_TARGETS[normalizedAction];
    const trimmedReason = reason?.trim() || null;

    if (
      (normalizedAction === 'HIDE' || normalizedAction === 'REMOVE') &&
      !trimmedReason
    ) {
      throw new BadRequestException(
        `A reason is required to ${normalizedAction.toLowerCase()} a review`,
      );
    }

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new BadRequestException('Review not found');
    }

    const currentStatus: ReviewStatusValue = review.status ?? 'VISIBLE';
    const allowed = MODERATION_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot ${normalizedAction.toLowerCase()} a review in status ${currentStatus}`,
      );
    }

    const actorId = actor?.id ?? actor?.userId ?? null;
    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status: targetStatus,
        moderatedById: actorId,
        moderatedAt: new Date(),
        moderationReason: trimmedReason,
      },
    });

    await this.prisma.auditLog
      .create({
        data: {
          actorId,
          actorEmail: actor?.email,
          action: 'REVIEW_MODERATED',
          targetType: 'Review',
          targetId: reviewId,
          metadata: {
            moderationAction: normalizedAction,
            fromStatus: currentStatus,
            toStatus: targetStatus,
            reason: trimmedReason,
          },
        },
      })
      .catch((err: unknown) => console.error('Audit log failed', err));

    // Keep the trip's stored rating in sync with VISIBLE-only stats.
    await this.updateTripRating(review.tripTemplateId);

    return updated;
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
