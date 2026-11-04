import { FunnelMetricsService } from './funnel-metrics.service';

/**
 * #756: the funnel readout derives ONLY aggregate server facts and its
 * payload must never carry a prohibited field (docs/funnel-measurement.md
 * §Privacy contract): no identifiers, no search text, no payment data,
 * no free text — at any depth.
 */

const PROHIBITED_KEYS = [
  'query',
  'email',
  'name',
  'fullName',
  'travelerId',
  'userId',
  'agencyId',
  'bookingId',
  'token',
  'password',
  'bankReference',
  'paymentProofUrl',
  'paymentProofId',
  'message',
  'content',
  'amount',
  'totalAmount',
  'ip',
  'userAgent',
];

function assertNoProhibitedKeys(value: unknown, path = 'root'): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoProhibitedKeys(item, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      expect(PROHIBITED_KEYS).not.toContain(key);
      assertNoProhibitedKeys(child, `${path}.${key}`);
    }
  }
}

function makePrisma() {
  return {
    searchEvent: {
      count: jest.fn(async ({ where }: any) => (where.resultCount === 0 ? 25 : 200)),
    },
    booking: {
      count: jest.fn(async ({ where }: any) => {
        if (where.paymentProofId) return 60;
        if (where.status === 'AWAITING_VALIDATION') return 10;
        if (where.confirmedAt) return 55;
        return 80;
      }),
      groupBy: jest.fn(async () => [
        { status: 'COMPLETED', _count: { _all: 40 } },
        { status: 'CANCELLED', _count: { _all: 8 } },
        { status: 'CONFIRMED', _count: { _all: 15 } },
      ]),
    },
    externalPayment: {
      findMany: jest.fn(async () => [{ bookingId: 'b1' }, { bookingId: 'b1' }, { bookingId: 'b2' }]),
    },
    refundCase: {
      groupBy: jest.fn(async () => [
        { status: 'REFUND_COMPLETED', _count: { _all: 3 } },
        { status: 'REFUND_REQUESTED', _count: { _all: 2 } },
      ]),
    },
  };
}

describe('FunnelMetricsService (#756)', () => {
  it('derives the server-observable funnel steps and conversions from operational rows', async () => {
    const service = new FunnelMetricsService(makePrisma() as never);
    const out: any = await service.getFunnelMetrics(new Date('2026-10-01T00:00:00Z'), new Date('2026-10-31T00:00:00Z'), new Date('2026-11-01T00:00:00Z'));
    expect(out.steps).toEqual({
      searches: 200,
      searchesZeroResult: 25,
      bookingsCreated: 80,
      proofsSubmitted: 60,
      proofsPending: 10,
      // Two payments for b1 collapse into ONE bank-confirmed booking.
      bankConfirmedBookings: 2,
      confirmedBookings: 55,
      completedBookings: 40,
      cancelledBookings: 8,
    });
    expect(out.conversions.zeroResultRatePercent).toBe(12.5);
    expect(out.conversions.bookingPerSearchPercent).toBe(40);
    expect(out.conversions.proofPerBookingPercent).toBe(75);
    expect(out.conversions.completedPerConfirmedPercent).toBe(72.7);
    expect(out.refunds).toEqual({ total: 5, byStatus: { REFUND_COMPLETED: 3, REFUND_REQUESTED: 2 } });
  });

  it('returns null conversions (never NaN or invented numbers) on an empty window', async () => {
    const empty = {
      searchEvent: { count: jest.fn(async () => 0) },
      booking: { count: jest.fn(async () => 0), groupBy: jest.fn(async () => []) },
      externalPayment: { findMany: jest.fn(async () => []) },
      refundCase: { groupBy: jest.fn(async () => []) },
    };
    const service = new FunnelMetricsService(empty as never);
    const out: any = await service.getFunnelMetrics();
    expect(out.conversions.bookingPerSearchPercent).toBeNull();
    expect(out.conversions.proofPerBookingPercent).toBeNull();
    expect(out.steps.searches).toBe(0);
  });

  it('carries no prohibited field at any depth of the payload', async () => {
    const service = new FunnelMetricsService(makePrisma() as never);
    const out = await service.getFunnelMetrics();
    assertNoProhibitedKeys(out);
  });

  it('rejects an inverted window', async () => {
    const service = new FunnelMetricsService(makePrisma() as never);
    await expect(
      service.getFunnelMetrics(new Date('2026-11-02T00:00:00Z'), new Date('2026-11-01T00:00:00Z')),
    ).rejects.toThrow('from must be before to');
  });
});
