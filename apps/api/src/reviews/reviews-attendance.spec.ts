import { BadRequestException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

/**
 * #434 (Council P1-08): review eligibility attaches to attendance.
 * Before this change, the date-based completion job made every
 * CONFIRMED booking reviewable at session end — including travellers
 * who never attended. These tests pin the new gate.
 */
function makeFakeDb(bookingOver: any = {}) {
  const booking: any = {
    id: 'booking-1',
    travelerId: 'traveler-1',
    status: 'COMPLETED',
    attendance: 'ATTENDED',
    session: { template: { id: 'trip-1', agencyId: 'agency-1' } },
    ...bookingOver,
  };
  const created: any[] = [];
  const db: any = {
    _created: created,
    booking: { findUnique: jest.fn(async () => booking) },
    review: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: 'review-1', ...data };
        created.push(row);
        return row;
      }),
      aggregate: jest.fn(async () => ({ _avg: { rating: 5 }, _count: { _all: created.length } })),
      groupBy: jest.fn(async () => []),
    },
    tripTemplate: { update: jest.fn(async () => ({})) },
  };
  return db;
}

const dto: any = { rating: 5, comment: 'Great trip' };

describe('ReviewsService.createReview attendance gate (#434)', () => {
  it('COMPLETED + ATTENDED creates the review', async () => {
    const db = makeFakeDb();
    const review: any = await new ReviewsService(db as any).createReview('booking-1', 'traveler-1', dto);
    expect(review.id).toBe('review-1');
    expect(db._created).toHaveLength(1);
  });

  it('COMPLETED with attendance not yet recorded is NOT reviewable (date completion alone is not enough)', async () => {
    const db = makeFakeDb({ attendance: null });
    await expect(
      new ReviewsService(db as any).createReview('booking-1', 'traveler-1', dto),
    ).rejects.toThrow('recorded attendance');
    expect(db._created).toHaveLength(0);
  });

  it('NO_SHOW bookings can never be reviewed', async () => {
    const db = makeFakeDb({ status: 'NO_SHOW', attendance: 'NO_SHOW' });
    await expect(
      new ReviewsService(db as any).createReview('booking-1', 'traveler-1', dto),
    ).rejects.toThrow('no-show');
    expect(db._created).toHaveLength(0);
  });

  it('a non-completed booking keeps the pre-existing completion error', async () => {
    const db = makeFakeDb({ status: 'CONFIRMED', attendance: null });
    await expect(
      new ReviewsService(db as any).createReview('booking-1', 'traveler-1', dto),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db._created).toHaveLength(0);
  });
});
