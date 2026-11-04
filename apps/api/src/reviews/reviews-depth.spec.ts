import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReviewsService, validateReviewPhotoKeys } from './reviews.service';

/**
 * #776 (Council S6 Phase 3): review depth — sub-scores + traveller
 * photos. In-memory fake of the Prisma surface, honouring the VISIBLE
 * filter and Prisma's null-skipping `_avg` semantics for sub-scores.
 * No seeded/fake reviews are written anywhere: these rows exist only
 * inside this unit harness.
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
        return {
          ...row,
          photos: photos.filter((p) => p.reviewId === row.id),
        };
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
  // createReview reads review.count for the PENDING gate; the public
  // list reads it for totals. One jest.fn serving both call shapes:
  const gateCount = db.review.count;
  db.review.count = jest.fn(async (args: any) => {
    if (args?.where?.tripTemplateId || args?.where?.status) {
      return [...reviews.values()].filter((r) => matches(r, args.where)).length;
    }
    return gateCount();
  });
  return db;
}

const PHOTO_KEY = 'private/traveler-1/review-photos/abc-123.jpg';
const ADMIN = { id: 'admin-1', email: 'admin@ouiboo.test' };

describe('ReviewsService review depth (#776)', () => {
  it('creates a review with sub-scores and photos, stored as given', async () => {
    const db = makeFakeDb({ priorReviews: 1 });
    const svc = new ReviewsService(db);
    const review: any = await svc.createReview('booking-1', 'traveler-1', {
      rating: 5,
      comment: 'Great',
      organisationRating: 5,
      guideRating: 4,
      valueRating: 3,
      accuracyRating: 5,
      photoKeys: [PHOTO_KEY, 'private/traveler-1/review-photos/def-456.png'],
    } as any);
    expect(review.organisationRating).toBe(5);
    expect(review.guideRating).toBe(4);
    expect(review.valueRating).toBe(3);
    expect(review.accuracyRating).toBe(5);
    expect(db._photos).toHaveLength(2);
    expect(db._photos.map((p: any) => p.storageKey)).toEqual([
      PHOTO_KEY,
      'private/traveler-1/review-photos/def-456.png',
    ]);
    expect(db._photos.every((p: any) => p.reviewId === review.id)).toBe(true);
  });

  it('keeps sub-scores nullable: a review without them stores nulls', async () => {
    const db = makeFakeDb({ priorReviews: 1 });
    const svc = new ReviewsService(db);
    const review: any = await svc.createReview('booking-1', 'traveler-1', {
      rating: 4,
    } as any);
    expect(review.organisationRating).toBeNull();
    expect(review.guideRating).toBeNull();
    expect(review.valueRating).toBeNull();
    expect(review.accuracyRating).toBeNull();
    expect(db._photos).toHaveLength(0);
  });

  it.each([0, 6, 2.5])('rejects an out-of-range sub-score (%s)', async (bad) => {
    const db = makeFakeDb();
    const svc = new ReviewsService(db);
    await expect(
      svc.createReview('booking-1', 'traveler-1', {
        rating: 5,
        guideRating: bad,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects photo keys that are not the traveller own private review photos', async () => {
    const db = makeFakeDb();
    const svc = new ReviewsService(db);
    const badKeys = [
      'private/traveler-2/review-photos/abc-123.jpg', // another traveller
      'trips/agency-1/abc-123.jpg', // public trip asset
      'private/traveler-1/payment-proofs/abc-123.jpg', // different intent
      'private/traveler-1/review-photos/../secret.jpg', // traversal
      'private/traveler-1/review-photos/statement.pdf', // not an image
    ];
    for (const key of badKeys) {
      await expect(
        svc.createReview('booking-1', 'traveler-1', { rating: 5, photoKeys: [key] } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(db._photos).toHaveLength(0);
  });

  it('caps a review at 3 photos', async () => {
    const keys = [1, 2, 3, 4].map((i) => `private/traveler-1/review-photos/p${i}.jpg`);
    expect(() => validateReviewPhotoKeys('traveler-1', keys)).toThrow(BadRequestException);
    const db = makeFakeDb();
    await expect(
      new ReviewsService(db).createReview('booking-1', 'traveler-1', {
        rating: 5,
        photoKeys: keys,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('gates sub-score averages below 5 reviews: nulls, count still published', async () => {
    const db = makeFakeDb();
    const svc = new ReviewsService(db);
    for (let i = 0; i < 4; i += 1) {
      db._reviews.set(`rev-seed-${i}`, {
        id: `rev-seed-${i}`,
        tripTemplateId: 'trip-1',
        travelerId: `t-${i}`,
        rating: 5,
        status: 'VISIBLE',
        organisationRating: 5,
        guideRating: 5,
        valueRating: 5,
        accuracyRating: 5,
      });
    }
    const below = await svc.getReviewStats('trip-1');
    expect(below.totalReviews).toBe(4);
    expect(below.subScores).toEqual({
      organisation: null,
      guide: null,
      value: null,
      accuracy: null,
    });

    db._reviews.set('rev-seed-4', {
      id: 'rev-seed-4',
      tripTemplateId: 'trip-1',
      travelerId: 't-4',
      rating: 3,
      status: 'VISIBLE',
      organisationRating: 3,
      guideRating: 1,
      valueRating: 5,
      accuracyRating: 3,
    });
    const above = await svc.getReviewStats('trip-1');
    expect(above.totalReviews).toBe(5);
    expect(above.subScores).toEqual({
      organisation: 4.6, // (5+5+5+5+3)/5
      guide: 4.2, // (5+5+5+5+1)/5
      value: 5,
      accuracy: 4.6,
    });
  });

  it('does not serve a photo before moderation; RESTORE makes it servable', async () => {
    const db = makeFakeDb({ priorReviews: 0 }); // first review -> PENDING
    const svc = new ReviewsService(db);
    const review: any = await svc.createReview('booking-1', 'traveler-1', {
      rating: 5,
      organisationRating: 4,
      photoKeys: [PHOTO_KEY],
    } as any);
    expect(review.status).toBe('PENDING');

    // Not publicly fetchable pre-moderation.
    await expect(
      svc.getVisibleReviewPhotoKey('trip-1', review.id, 0),
    ).rejects.toBeInstanceOf(NotFoundException);

    // The public list cannot leak it either (PENDING is filtered out).
    const list = await svc.getReviewsByTrip('trip-1');
    expect(list.total).toBe(0);

    // Moderation detail shows the moderator what they are approving.
    const detail: any = await svc.getReviewForModeration(review.id);
    expect(detail.organisationRating).toBe(4);
    expect(detail.photoKeys).toEqual([PHOTO_KEY]);

    // RESTORE -> VISIBLE: the moderation result itself carries the
    // photo keys, and the photo endpoint now resolves the key.
    const restored: any = await svc.moderateReview(review.id, ADMIN, 'RESTORE');
    expect(restored.status).toBe('VISIBLE');
    expect(restored.photoKeys).toEqual([PHOTO_KEY]);
    await expect(svc.getVisibleReviewPhotoKey('trip-1', review.id, 0)).resolves.toBe(
      PHOTO_KEY,
    );

    // Public list now exposes the photo as a gated path, never a key.
    const visible = await svc.getReviewsByTrip('trip-1');
    expect(visible.total).toBe(1);
    expect((visible.reviews[0] as any).photos).toEqual([
      `/trips/trip-1/reviews/${review.id}/photos/0`,
    ]);
    expect(JSON.stringify(visible.reviews[0])).not.toContain('review-photos');
  });
});
