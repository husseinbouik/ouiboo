import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ReviewsService } from './reviews.service';
import { AdminReviewsController } from './reviews.controller';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * #393 — review moderation lifecycle.
 * In-memory fake of the Prisma surface ReviewsService uses, honouring
 * the `status` filter so public visibility / aggregate tests exercise
 * the real query shapes.
 */
function makeFakeDb(seed: any[] = []) {
  const reviews = new Map<string, any>(seed.map((r) => [r.id, { ...r }]));
  const auditRows: any[] = [];
  const tripUpdates: any[] = [];

  const matches = (row: any, where: any = {}) =>
    (where.tripTemplateId === undefined || row.tripTemplateId === where.tripTemplateId) &&
    (where.status === undefined || row.status === where.status);

  const db: any = {
    _reviews: reviews,
    _auditRows: auditRows,
    _tripUpdates: tripUpdates,
    review: {
      findUnique: jest.fn(async ({ where }: any) => reviews.get(where.id) ?? null),
      findMany: jest.fn(async ({ where, skip = 0, take }: any) => {
        const rows = [...reviews.values()].filter((r) => matches(r, where));
        return rows.slice(skip, take === undefined ? undefined : skip + take);
      }),
      count: jest.fn(async ({ where }: any) =>
        [...reviews.values()].filter((r) => matches(r, where)).length,
      ),
      aggregate: jest.fn(async ({ where }: any) => {
        const rows = [...reviews.values()].filter((r) => matches(r, where));
        const avg = rows.length
          ? rows.reduce((sum, r) => sum + r.rating, 0) / rows.length
          : null;
        return { _avg: { rating: avg }, _count: { _all: rows.length } };
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
    auditLog: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `audit-${auditRows.length + 1}`, ...data };
        auditRows.push(row);
        return row;
      }),
    },
    tripTemplate: {
      update: jest.fn(async ({ where, data }: any) => {
        tripUpdates.push({ where, data });
        return { id: where.id, ...data };
      }),
    },
  };
  return db;
}

const ADMIN = { id: 'admin-1', email: 'admin@ouiboo.test' };
const review = (over: any = {}) => ({
  id: 'rev-1',
  tripTemplateId: 'trip-1',
  travelerId: 'traveler-1',
  rating: 5,
  status: 'VISIBLE',
  ...over,
});

describe('ReviewsService.moderateReview (#393)', () => {
  it('VISIBLE -> HIDDEN stamps actor, time and reason and writes an audit row', async () => {
    const db = makeFakeDb([review()]);
    const svc = new ReviewsService(db);
    const updated = await svc.moderateReview('rev-1', ADMIN, 'HIDE', 'Spam links');
    expect(updated.status).toBe('HIDDEN');
    expect(updated.moderatedById).toBe('admin-1');
    expect(updated.moderatedAt).toBeInstanceOf(Date);
    expect(updated.moderationReason).toBe('Spam links');
    expect(db._auditRows).toHaveLength(1);
    expect(db._auditRows[0]).toMatchObject({
      actorId: 'admin-1',
      actorEmail: 'admin@ouiboo.test',
      action: 'REVIEW_MODERATED',
      targetType: 'Review',
      targetId: 'rev-1',
    });
    expect(db._auditRows[0].metadata).toMatchObject({
      moderationAction: 'HIDE',
      fromStatus: 'VISIBLE',
      toStatus: 'HIDDEN',
      reason: 'Spam links',
    });
  });

  it('VISIBLE -> REMOVED', async () => {
    const db = makeFakeDb([review()]);
    const svc = new ReviewsService(db);
    const updated = await svc.moderateReview('rev-1', ADMIN, 'REMOVE', 'Abusive content');
    expect(updated.status).toBe('REMOVED');
  });

  it('HIDDEN -> VISIBLE (RESTORE)', async () => {
    const db = makeFakeDb([review({ status: 'HIDDEN' })]);
    const svc = new ReviewsService(db);
    const updated = await svc.moderateReview('rev-1', ADMIN, 'RESTORE');
    expect(updated.status).toBe('VISIBLE');
  });

  it('HIDDEN -> REMOVED', async () => {
    const db = makeFakeDb([review({ status: 'HIDDEN' })]);
    const svc = new ReviewsService(db);
    const updated = await svc.moderateReview('rev-1', ADMIN, 'REMOVE', 'Confirmed fake');
    expect(updated.status).toBe('REMOVED');
  });

  it.each(['HIDE', 'REMOVE', 'RESTORE'] as const)(
    'REMOVED is terminal: %s is rejected with 400',
    async (action) => {
      const db = makeFakeDb([review({ status: 'REMOVED' })]);
      const svc = new ReviewsService(db);
      await expect(
        svc.moderateReview('rev-1', ADMIN, action, 'reason'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db._reviews.get('rev-1').status).toBe('REMOVED');
    },
  );

  it('rejects no-op transitions (VISIBLE->RESTORE, HIDDEN->HIDE)', async () => {
    const dbVisible = makeFakeDb([review()]);
    await expect(
      new ReviewsService(dbVisible).moderateReview('rev-1', ADMIN, 'RESTORE'),
    ).rejects.toBeInstanceOf(BadRequestException);

    const dbHidden = makeFakeDb([review({ status: 'HIDDEN' })]);
    await expect(
      new ReviewsService(dbHidden).moderateReview('rev-1', ADMIN, 'HIDE', 'again'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires a reason for HIDE and REMOVE', async () => {
    const db = makeFakeDb([review()]);
    const svc = new ReviewsService(db);
    await expect(svc.moderateReview('rev-1', ADMIN, 'HIDE')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(svc.moderateReview('rev-1', ADMIN, 'REMOVE', '   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an unknown action and a missing review', async () => {
    const db = makeFakeDb([review()]);
    const svc = new ReviewsService(db);
    await expect(
      svc.moderateReview('rev-1', ADMIN, 'DELETE' as any, 'x'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc.moderateReview('missing', ADMIN, 'HIDE', 'x'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('legacy stub actions still work: approve = RESTORE, reject = REMOVE', async () => {
    const dbHidden = makeFakeDb([review({ status: 'HIDDEN' })]);
    const restored = await new ReviewsService(dbHidden).moderateReview(
      'rev-1',
      ADMIN,
      'approve',
    );
    expect(restored.status).toBe('VISIBLE');

    const dbVisible = makeFakeDb([review()]);
    const removed = await new ReviewsService(dbVisible).moderateReview(
      'rev-1',
      ADMIN,
      'reject',
      'Policy violation',
    );
    expect(removed.status).toBe('REMOVED');
  });
});

describe('Public visibility and aggregates (#393)', () => {
  const seed = () => [
    review({ id: 'rev-visible', rating: 5 }),
    review({ id: 'rev-hidden', rating: 1, status: 'HIDDEN' }),
    review({ id: 'rev-removed', rating: 1, status: 'REMOVED' }),
  ];

  it('public list returns only VISIBLE reviews', async () => {
    const svc = new ReviewsService(makeFakeDb(seed()));
    const result = await svc.getReviewsByTrip('trip-1');
    expect(result.total).toBe(1);
    expect(result.reviews.map((r: any) => r.id)).toEqual(['rev-visible']);
  });

  it('stats aggregate only VISIBLE reviews', async () => {
    const svc = new ReviewsService(makeFakeDb(seed()));
    const stats = await svc.getReviewStats('trip-1');
    expect(stats.totalReviews).toBe(1);
    expect(stats.averageRating).toBe(5);
    expect(stats.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 });
  });

  it('hiding the only visible review zeroes the stored trip rating', async () => {
    const db = makeFakeDb(seed());
    const svc = new ReviewsService(db);
    await svc.moderateReview('rev-visible', ADMIN, 'HIDE', 'Under investigation');
    const lastUpdate = db._tripUpdates[db._tripUpdates.length - 1];
    expect(lastUpdate.data).toMatchObject({ averageRating: 0, reviewCount: 0 });
  });
});

describe('Admin moderation endpoint role checks (#393)', () => {
  const guard = new RolesGuard(new Reflector());
  const contextFor = (role?: string) =>
    ({
      getHandler: () => AdminReviewsController.prototype.moderateReview,
      getClass: () => AdminReviewsController,
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { id: 'u-1', role } : undefined }),
      }),
    }) as any;

  it('allows ADMIN', () => {
    expect(guard.canActivate(contextFor('ADMIN'))).toBe(true);
  });

  it.each(['TRAVELER', 'AGENCY'])('denies %s with the guard (403 at the edge)', (role) => {
    expect(guard.canActivate(contextFor(role))).toBe(false);
  });

  it('denies a request with no authenticated user', () => {
    expect(guard.canActivate(contextFor(undefined))).toBe(false);
  });
});

describe('Review hardening (#439): pre-publication moderation, edit limits, self-booking friction', () => {
  function makeCreateDb(options: { priorReviews?: number; agencyOwnerId?: string } = {}) {
    const created: any[] = [];
    const booking = {
      id: 'booking-1',
      travelerId: 'traveler-1',
      status: 'COMPLETED',
      session: { template: { id: 'trip-1', agencyId: 'agency-profile-1' } },
    };
    const db: any = {
      booking: { findUnique: jest.fn(async () => booking) },
      agencyProfile: {
        findUnique: jest.fn(async () => ({ userId: options.agencyOwnerId ?? 'someone-else' })),
      },
      review: {
        findUnique: jest.fn(async () => null),
        count: jest.fn(async () => options.priorReviews ?? 0),
        create: jest.fn(async ({ data }: any) => {
          const row = { id: 'rev-new', createdAt: new Date(), editCount: 0, ...data };
          created.push(row);
          return row;
        }),
        aggregate: jest.fn(async () => ({ _avg: { rating: 5 }, _count: { _all: 1 } })),
        groupBy: jest.fn(async () => []),
      },
      tripTemplate: { update: jest.fn(async () => ({})) },
      auditLog: { create: jest.fn(async () => ({})) },
    };
    return { db, created };
  }

  it("holds a traveller's FIRST review in PENDING and does not move the trip rating", async () => {
    const { db, created } = makeCreateDb({ priorReviews: 0 });
    const svc = new ReviewsService(db);
    const review = await svc.createReview('booking-1', 'traveler-1', { rating: 5, comment: 'Great' } as any);
    expect(review.status).toBe('PENDING');
    expect(created[0].status).toBe('PENDING');
    expect(db.tripTemplate.update).not.toHaveBeenCalled();
  });

  it('publishes a returning traveller\'s review immediately (VISIBLE)', async () => {
    const { db } = makeCreateDb({ priorReviews: 2 });
    const svc = new ReviewsService(db);
    const review = await svc.createReview('booking-1', 'traveler-1', { rating: 4 } as any);
    expect(review.status).toBe('VISIBLE');
    expect(db.tripTemplate.update).toHaveBeenCalled();
  });

  it('always holds a self-booking review (agency owner reviewing own trip), even with history', async () => {
    const { db } = makeCreateDb({ priorReviews: 5, agencyOwnerId: 'traveler-1' });
    const svc = new ReviewsService(db);
    const review = await svc.createReview('booking-1', 'traveler-1', { rating: 5 } as any);
    expect(review.status).toBe('PENDING');
  });

  it('admin can approve a PENDING review (RESTORE -> VISIBLE) and reject it (reject -> REMOVED)', async () => {
    const db = makeFakeDb([review({ status: 'PENDING' })]);
    const svc = new ReviewsService(db);
    const approved = await svc.moderateReview('rev-1', ADMIN, 'RESTORE');
    expect(approved.status).toBe('VISIBLE');

    const db2 = makeFakeDb([review({ status: 'PENDING' })]);
    const svc2 = new ReviewsService(db2);
    const removed = await svc2.moderateReview('rev-1', ADMIN, 'reject', 'Self-review spam');
    expect(removed.status).toBe('REMOVED');
  });

  it('PENDING reviews are excluded from the public list and stats', async () => {
    const db = makeFakeDb([
      review({ id: 'rev-p', status: 'PENDING' }),
      review({ id: 'rev-v', status: 'VISIBLE' }),
    ]);
    const svc = new ReviewsService(db);
    const list = await svc.getReviewsByTrip('trip-1');
    expect(list.total).toBe(1);
    expect(list.reviews.map((r: any) => r.id)).toEqual(['rev-v']);
    const stats = await svc.getReviewStats('trip-1');
    expect(stats.totalReviews).toBe(1);
  });

  function makeUpdateDb(existing: any) {
    const withBooking = {
      booking: { session: { template: { id: 'trip-1' } } },
      ...existing,
    };
    const db: any = {
      review: {
        findUnique: jest.fn(async () => withBooking),
        update: jest.fn(async ({ data }: any) => ({ ...withBooking, ...data })),
        aggregate: jest.fn(async () => ({ _avg: { rating: 5 }, _count: { _all: 1 } })),
        groupBy: jest.fn(async () => []),
      },
      tripTemplate: { update: jest.fn(async () => ({})) },
    };
    return db;
  }

  it('editing a VISIBLE review increments editCount and returns it to PENDING moderation', async () => {
    const existing = review({ editCount: 1, createdAt: new Date() });
    const db = makeUpdateDb(existing);
    const svc = new ReviewsService(db);
    const updated = await svc.updateReview('rev-1', 'traveler-1', { comment: 'Edited' } as any);
    expect(updated.editCount).toBe(2);
    expect(updated.status).toBe('PENDING');
  });

  it('rejects edits beyond the edit limit and beyond the edit window', async () => {
    const atLimit = makeUpdateDb(review({ editCount: 3, createdAt: new Date() }));
    await expect(
      new ReviewsService(atLimit).updateReview('rev-1', 'traveler-1', { comment: 'x' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    const tooOld = makeUpdateDb(
      review({ editCount: 0, createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) }),
    );
    await expect(
      new ReviewsService(tooOld).updateReview('rev-1', 'traveler-1', { comment: 'x' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
