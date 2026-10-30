import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateReviewDto, UpdateReviewDto, ReviewResponseDto } from './dto/create-review.dto';
import { derivePublicMediaUrl } from '../upload/media-url.util';

export type ReviewStatusValue = 'PENDING' | 'VISIBLE' | 'HIDDEN' | 'REMOVED';
export type ReviewModerationAction = 'HIDE' | 'REMOVE' | 'RESTORE';

/** #439 (Council P1-14): author edit budget — at most 3 edits, within 30 days. */
export const MAX_REVIEW_EDITS = 3;
export const REVIEW_EDIT_WINDOW_DAYS = 30;

const MODERATION_TARGETS: Record<ReviewModerationAction, ReviewStatusValue> = {
  HIDE: 'HIDDEN',
  REMOVE: 'REMOVED',
  RESTORE: 'VISIBLE',
};

/** Allowed status transitions. REMOVED is terminal. #439: a PENDING
 * (pre-publication moderation) review can be approved to VISIBLE or
 * removed; it cannot be hidden (it is not public yet). */
const MODERATION_TRANSITIONS: Record<ReviewStatusValue, ReviewStatusValue[]> = {
  PENDING: ['VISIBLE', 'REMOVED'],
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

    // #434 (Council P1-08): a traveller the agency recorded as NO_SHOW
    // can never review the trip they did not attend.
    if (booking.status === 'NO_SHOW' || booking.attendance === 'NO_SHOW') {
      throw new BadRequestException(
        'Bookings recorded as no-show cannot be reviewed',
      );
    }

    // Verify booking is completed
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Can only review completed bookings',
      );
    }

    // #434 (Council P1-08): review eligibility attaches to ATTENDANCE,
    // not to the date-based completion job. A booking the job completed
    // on session end stays unreviewable until the agency records the
    // traveller as ATTENDED (BookingsService.markAttendance — agencies
    // can still record attendance for a COMPLETED booking, which is
    // the remediation path for pre-#434 completed bookings whose
    // attendance is still null).
    if (booking.attendance !== 'ATTENDED') {
      throw new BadRequestException(
        'Can only review bookings with recorded attendance',
      );
    }

    // Check if review already exists
    const existingReview = await this.prisma.review.findUnique({
      where: { bookingId },
    });

    if (existingReview) {
      throw new BadRequestException('Review already exists for this booking');
    }

    // #439 (Council P1-14): pre-publication moderation + self-booking
    // friction. The verified-booking gate above is unchanged. A
    // traveller's FIRST review is held in PENDING until an admin approves
    // it through moderateReview; a review of the traveller's OWN agency's
    // trip (self-booking) is always held, however many reviews they have.
    // PENDING reviews are invisible to the public list and aggregates,
    // which only count VISIBLE rows.
    const [priorReviewCount, agencyOwner] = await Promise.all([
      this.prisma.review.count({ where: { travelerId } }),
      this.prisma.agencyProfile?.findUnique
        ? this.prisma.agencyProfile.findUnique({
            where: { id: booking.session.template.agencyId },
            select: { userId: true },
          })
        : Promise.resolve(null),
    ]);
    const isSelfBookingReview = !!agencyOwner && agencyOwner.userId === travelerId;
    const initialStatus: ReviewStatusValue =
      priorReviewCount === 0 || isSelfBookingReview ? 'PENDING' : 'VISIBLE';

    // Create review
    const review = await this.prisma.review.create({
      data: {
        bookingId,
        // #428: stamp the tenant so the composite FKs bind this review
        // to the booking's and the template's agency simultaneously.
        agencyId: booking.agencyId ?? booking.session.template.agencyId,
        travelerId,
        tripTemplateId: booking.session.template.id,
        rating: dto.rating,
        comment: dto.comment,
        isVerifiedBooking: true,
        status: initialStatus,
      },
    });

    // Only a publicly visible review moves the stored trip rating.
    if (initialStatus === 'VISIBLE') {
      await this.updateTripRating(booking.session.template.id);
    }

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
      // #447: traveller avatars are stored file references — re-derive
      // them against the current public media base at read time.
      reviews: reviews.map((review) => ({
        ...review,
        // #692: the agency reply is public ONLY while its moderation
        // status is VISIBLE — a PENDING/HIDDEN/REMOVED reply never
        // leaves the API as public text.
        response: review.responseStatus === 'VISIBLE' ? review.response : null,
        responseStatus: review.responseStatus === 'VISIBLE' ? 'VISIBLE' : null,
        traveler: review.traveler
          ? { ...review.traveler, avatar: derivePublicMediaUrl(review.traveler.avatar) }
          : review.traveler,
      })),
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
   * Reply to a review (by the owning agency) — #692 (Council S6).
   *
   * One reply per review. The reply does NOT go public on write: it
   * enters the same moderation lifecycle as the review itself
   * (PENDING -> VISIBLE / HIDDEN / REMOVED via
   * moderateReviewResponse) and public payloads expose it only while
   * VISIBLE. Re-calling this endpoint edits the reply under the same
   * edit budget as review edits (#439 constants); editing a VISIBLE
   * reply sends it back to PENDING. The review author is notified when
   * the reply becomes VISIBLE (see moderateReviewResponse).
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

    // Verify agency owns the trip (tenant comes from the review row
    // stamped at creation, #428; the template chain is the fallback).
    const ownerAgencyId = review.agencyId ?? review.booking.session.template.agencyId;
    if (ownerAgencyId !== agencyId) {
      throw new ForbiddenException(
        'Not authorized to respond to this review',
      );
    }

    if ((review.status ?? 'VISIBLE') !== 'VISIBLE') {
      throw new BadRequestException('Can only reply to a visible review');
    }
    if (review.responseStatus === 'REMOVED') {
      throw new BadRequestException('A removed reply cannot be edited');
    }

    const responseText = dto.response?.trim();
    if (!responseText) {
      throw new BadRequestException('A reply cannot be empty');
    }

    const isEdit = !!review.response;
    const editCount: number = review.responseEditCount ?? 0;
    if (isEdit && editCount >= MAX_REVIEW_EDITS) {
      throw new BadRequestException(
        `Reply edit limit reached (${MAX_REVIEW_EDITS} edits)`,
      );
    }

    const updatedReview = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        response: responseText,
        // Every write (re-)enters moderation: no unmoderated public text.
        responseStatus: 'PENDING',
        responseEditCount: isEdit ? editCount + 1 : 0,
        respondedAt: new Date(),
        responseModeratedById: null,
        responseModeratedAt: null,
        responseModerationReason: null,
      },
    });

    return updatedReview;
  }

  /**
   * Moderate an agency reply (admin only) — #692. Mirrors
   * moderateReview exactly: same actions, same transition table, same
   * reason requirement for HIDE/REMOVE, same audit trail
   * (REVIEW_RESPONSE_MODERATED). When a reply becomes VISIBLE the
   * review author is notified (NotificationLog REVIEW_RESPONSE).
   */
  async moderateReviewResponse(
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
        `A reason is required to ${normalizedAction.toLowerCase()} a review reply`,
      );
    }

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        traveler: { select: { email: true, name: true } },
        tripTemplate: { select: { title: true } },
        agency: { select: { companyName: true } },
      },
    });

    if (!review || !review.response) {
      throw new BadRequestException('Review reply not found');
    }

    const currentStatus: ReviewStatusValue = review.responseStatus ?? 'PENDING';
    const allowed = MODERATION_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot ${normalizedAction.toLowerCase()} a review reply in status ${currentStatus}`,
      );
    }

    const actorId = actor?.id ?? actor?.userId ?? null;
    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        responseStatus: targetStatus,
        responseModeratedById: actorId,
        responseModeratedAt: new Date(),
        responseModerationReason: trimmedReason,
      },
    });

    await this.prisma.auditLog
      .create({
        data: {
          actorId,
          actorEmail: actor?.email,
          action: 'REVIEW_RESPONSE_MODERATED',
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

    // Author notification: only a VISIBLE reply is news to the author.
    if (targetStatus === 'VISIBLE' && review.traveler?.email) {
      await this.prisma.notificationLog
        .create({
          data: {
            userId: review.travelerId,
            notificationType: 'REVIEW_RESPONSE',
            recipientEmail: review.traveler.email,
            subject: 'The agency replied to your review',
            message: `${review.agency?.companyName ?? 'The agency'} replied to your review of "${review.tripTemplate?.title ?? 'your trip'}": ${review.response}`,
            status: 'SENT',
            metadata: { reviewId, agencyId: review.agencyId },
          },
        })
        .catch((err: unknown) => console.error('Reply notification log failed', err));
    }

    return updated;
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

    // #439 (Council P1-14): edit limits — previously unlimited edits,
    // forever. A removed review is terminal; otherwise the author gets
    // at most MAX_REVIEW_EDITS edits inside REVIEW_EDIT_WINDOW_DAYS of
    // publication. Editing a VISIBLE review sends it back to PENDING
    // pre-publication moderation, so an approved review cannot be
    // swapped for different content after the fact.
    if ((review.status ?? 'VISIBLE') === 'REMOVED') {
      throw new BadRequestException('A removed review cannot be edited');
    }
    const editCount: number = review.editCount ?? 0;
    if (editCount >= MAX_REVIEW_EDITS) {
      throw new BadRequestException(
        `Review edit limit reached (${MAX_REVIEW_EDITS} edits)`,
      );
    }
    if (review.createdAt) {
      const windowMs = REVIEW_EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() - new Date(review.createdAt).getTime() > windowMs) {
        throw new BadRequestException(
          `Reviews can only be edited within ${REVIEW_EDIT_WINDOW_DAYS} days of posting`,
        );
      }
    }

    const updatedReview = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating ?? review.rating,
        comment: dto.comment ?? review.comment,
        editCount: editCount + 1,
        ...((review.status ?? 'VISIBLE') === 'VISIBLE' ? { status: 'PENDING' as const } : {}),
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
   * Lifecycle: since #439 a traveller's first review and any self-booking
   * review start PENDING (existing rows keep their stored status). An
   * admin approves a PENDING review via RESTORE (-> VISIBLE) or removes
   * it. An admin may HIDE a VISIBLE review,
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
