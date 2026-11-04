import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReviewsService, validateReviewVideoKey } from './reviews.service';

/**
 * #783 (Council S6 Phase 3): video reviews — ONE optional traveller
 * video per review, extending the #776 photo pattern. In-memory fake
 * of the Prisma surface. No seeded/fake reviews are written anywhere:
 * these rows exist only inside this unit harness.
 */
function makeFakeDb(options: { priorReviews?: number } = {}) {
  const reviews = new Map<string, any>();
  const photos: any[] = [];
  const audits: any[] = [];
  let seq = 0;

  const matches = (row: any, where: any = {}) =>
    (where.tripTemplateId === undefined || row.tripTemplateId === where.tripTemplateId) &&
    (where.status === undefined || row.status === where.status);

  const booking = {
    id: 'booking-1',
    travelerId: 'traveler-1',
    agencyId: 'agency-1',
    status: 'COMPLETED',
    attendance: 'ATTENDED',
    session: { template: { id: 'trip-1', agencyId: 'agency-1' } },
  };

  const db: any = {
    _reviews: reviews,
    _photos: photos,
    _audits: audits,
    booking: { findUnique: jest.fn(async () => booking) },
    agencyProfile: {
      findUnique: jest.fn(async () => ({ userId: 'agency-owner-1' })),
    },
    review: {
      count: jest.fn(async () => options.priorReviews ?? 1),
      findUnique: jest.fn(async ({ where }: any) => {
        const row = reviews.get(where.id);
        if (!row) return null;
        return {
          ...row,
          booking,
          photos: photos
            .filter((p) => p.reviewId === row.id)
            .sort((a, b) => a.createdAt - b.createdAt),
        };
      }),
      create: jest.fn(async ({ data }: any) => {
        seq += 1;
        const row: any = { id: `rev-${seq}`, createdAt: new Date(), ...data };
        delete row.photos;
        reviews.set(row.id, row);
        for (const created of data.photos?.create ?? []) {
          photos.push({
            id: `photo-${photos.length + 1}`,
            reviewId: row.id,
            storageKey: created.storageKey,
            createdAt: new Date(Date.now() + photos.length),
          });
        }
        return { ...row, photos: photos.filter((p) => p.reviewId === row.id) };
      }),
      findMany: jest.fn(async ({ where, skip = 0, take }: any) => {
        const rows = [...reviews.values()].filter((r) => matches(r, where));
        return rows.slice(skip, take === undefined ? undefined : skip + take).map((r) => ({
          ...r,
          traveler: { id: r.travelerId, name: 'Traveller', avatar: null },
          photos: photos
            .filter((p) => p.reviewId === r.id)
            .map((p) => ({ storageKey: p.storageKey })),
        }));
      }),
      aggregate: jest.fn(async ({ where }: any) => {
        const rows = [...reviews.values()].filter((r) => matches(r, where));
        const avg = (field: string) => {
          const values = rows.map((r) => r[field]).filter((v) => typeof v === 'number');
          return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
        };
        return {
          _avg: {
            rating: avg('rating'),
            organisationRating: avg('organisationRating'),
            guideRating: avg('guideRating'),
            valueRating: avg('valueRating'),
            accuracyRating: avg('accuracyRating'),
          },
          _count: { _all: rows.length },
        };
      }),
      groupBy: jest.fn(async ({ where }: any) => {
        const rows = [...reviews.values()].filter((r) => matches(r, where));
        const byRating = new Map<number, number>();
        for (const r of rows) byRating.set(r.rating, (byRating.get(r.rating) ?? 0) + 1);
        return [...byRating.entries()].map(([rating, count]) => ({
          rating,
          _count: { _all: count },
        }));
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = reviews.get(where.id);
        Object.assign(row, data);
        return row;
      }),
    },
    reviewPhoto: {
      findMany: jest.fn(async ({ where }: any) =>
        photos.filter((p) => p.reviewId === where.reviewId),
      ),
    },
    auditLog: {
      create: jest.fn(async ({ data }: any) => {
        audits.push(data);
        return data;
      }),
    },
    tripTemplate: { update: jest.fn(async () => ({})) },
  };
  const gateCount = db.review.count;
  db.review.count = jest.fn(async (args: any) => {
    if (args?.where?.tripTemplateId || args?.where?.status) {
      return [...reviews.values()].filter((r) => matches(r, args.where)).length;
    }
    return gateCount();
  });
  return db;
}

const VIDEO_KEY = 'private/traveler-1/review-videos/clip-123.mp4';
const ADMIN = { id: 'admin-1', email: 'admin@ouiboo.test' };

describe('ReviewsService video reviews (#783)', () => {
  it('creates a review with a video, stored as given', async () => {
    const db = makeFakeDb({ priorReviews: 1 });
    const svc = new ReviewsService(db);
    const review: any = await svc.createReview('booking-1', 'traveler-1', {
      rating: 5,
      comment: 'Great',
      videoKey: VIDEO_KEY,
    } as any);
    expect(review.videoKey).toBe(VIDEO_KEY);
  });

  it('keeps the video nullable: a review without one stores null', async () => {
    const db = makeFakeDb({ priorReviews: 1 });
    const svc = new ReviewsService(db);
    const review: any = await svc.createReview('booking-1', 'traveler-1', {
      rating: 4,
    } as any);
    expect(review.videoKey).toBeNull();
  });

  it.each(['.mp4', '.webm', '.mov'])('accepts a %s video key', (ext) => {
    expect(
      validateReviewVideoKey('traveler-1', `private/traveler-1/review-videos/clip${ext}`),
    ).toBe(`private/traveler-1/review-videos/clip${ext}`);
    expect(validateReviewVideoKey('traveler-1', undefined)).toBeNull();
    expect(validateReviewVideoKey('traveler-1', null)).toBeNull();
  });

  it('rejects video keys that are not the traveller own private review videos', async () => {
    const db = makeFakeDb();
    const svc = new ReviewsService(db);
    const badKeys = [
      'private/traveler-2/review-videos/clip.mp4', // another traveller
      'trips/agency-1/clip.mp4', // public trip asset
      'private/traveler-1/review-photos/clip.mp4', // photo intent folder
      'private/traveler-1/payment-proofs/clip.mp4', // different intent
      'private/traveler-1/review-videos/../secret.mp4', // traversal
      'private/traveler-1/review-videos/photo.jpg', // not a video
      'private/traveler-1/review-videos/statement.pdf', // not a video
    ];
    for (const key of badKeys) {
      expect(() => validateReviewVideoKey('traveler-1', key)).toThrow(BadRequestException);
      await expect(
        svc.createReview('booking-1', 'traveler-1', { rating: 5, videoKey: key } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(db._reviews.size).toBe(0);
  });

  it('does not serve the video before moderation; RESTORE makes it servable, HIDE closes it again', async () => {
    const db = makeFakeDb({ priorReviews: 0 }); // first review -> PENDING
    const svc = new ReviewsService(db);
    const review: any = await svc.createReview('booking-1', 'traveler-1', {
      rating: 5,
      videoKey: VIDEO_KEY,
    } as any);
    expect(review.status).toBe('PENDING');

    // Not publicly fetchable pre-moderation, and not on another trip.
    await expect(
      svc.getVisibleReviewVideoKey('trip-1', review.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      svc.getVisibleReviewVideoKey('trip-2', review.id),
    ).rejects.toBeInstanceOf(NotFoundException);

    // The public list cannot leak it either (PENDING is filtered out).
    const list = await svc.getReviewsByTrip('trip-1');
    expect(list.total).toBe(0);

    // Moderation detail shows the moderator the video key + status.
    const detail: any = await svc.getReviewForModeration(review.id);
    expect(detail.videoKey).toBe(VIDEO_KEY);
    expect(detail.videoStatus).toBe('PENDING');

    // RESTORE -> VISIBLE: the moderation result carries the video
    // key + status, and the video endpoint now resolves the key.
    const restored: any = await svc.moderateReview(review.id, ADMIN, 'RESTORE');
    expect(restored.status).toBe('VISIBLE');
    expect(restored.videoKey).toBe(VIDEO_KEY);
    expect(restored.videoStatus).toBe('VISIBLE');
    await expect(svc.getVisibleReviewVideoKey('trip-1', review.id)).resolves.toBe(VIDEO_KEY);

    // Public list exposes the video as a gated path, never a key.
    const visible = await svc.getReviewsByTrip('trip-1');
    expect(visible.total).toBe(1);
    expect((visible.reviews[0] as any).video).toBe(
      `/trips/trip-1/reviews/${review.id}/video`,
    );
    expect((visible.reviews[0] as any).videoKey).toBeUndefined();
    expect(JSON.stringify(visible.reviews[0])).not.toContain('review-videos');

    // HIDE closes the gate again.
    await svc.moderateReview(review.id, ADMIN, 'HIDE', 'needs a second look');
    await expect(
      svc.getVisibleReviewVideoKey('trip-1', review.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exposes video: null on a visible review without a video', async () => {
    const db = makeFakeDb({ priorReviews: 1 }); // -> VISIBLE directly
    const svc = new ReviewsService(db);
    await svc.createReview('booking-1', 'traveler-1', { rating: 4 } as any);
    const visible = await svc.getReviewsByTrip('trip-1');
    expect(visible.total).toBe(1);
    expect((visible.reviews[0] as any).video).toBeNull();
  });

  it('lets the author replace the video on update, clear it with null, and rejects foreign keys', async () => {
    const db = makeFakeDb({ priorReviews: 1 });
    const svc = new ReviewsService(db);
    const review: any = await svc.createReview('booking-1', 'traveler-1', {
      rating: 5,
      videoKey: VIDEO_KEY,
    } as any);

    const replaced: any = await svc.updateReview(review.id, 'traveler-1', {
      videoKey: 'private/traveler-1/review-videos/clip-456.webm',
    } as any);
    expect(replaced.videoKey).toBe('private/traveler-1/review-videos/clip-456.webm');

    // Omitting videoKey keeps the stored value untouched.
    const kept: any = await svc.updateReview(review.id, 'traveler-1', {
      comment: 'Edited comment',
    } as any);
    expect(kept.videoKey).toBe('private/traveler-1/review-videos/clip-456.webm');
    expect(kept.comment).toBe('Edited comment');

    await expect(
      svc.updateReview(review.id, 'traveler-1', {
        videoKey: 'private/traveler-2/review-videos/clip.mp4',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    const cleared: any = await svc.updateReview(review.id, 'traveler-1', {
      videoKey: null,
    } as any);
    expect(cleared.videoKey).toBeNull();
  });
});
