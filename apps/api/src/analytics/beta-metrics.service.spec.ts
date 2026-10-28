import { BadRequestException } from '@nestjs/common';
import { BetaMetricsService } from './beta-metrics.service';

const NOW = new Date('2026-10-27T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000);

function buildMock(overrides: Record<string, any> = {}) {
  const mock: any = {
    searchEvent: {
      count: jest.fn(async ({ where }: any) => (where.resultCount === 0 ? 5 : 50)),
    },
    booking: {
      count: jest.fn(async ({ where }: any) => {
        if (where.termsVersion === null && where.createdAt) return 0; // null terms in window
        if (where.termsVersion === null) return 3; // null terms all time (legacy)
        if (where.status) return 2; // stuck bookings
        return 40; // bookings created in window
      }),
      groupBy: jest.fn(async ({ by }: any) => {
        if (by.includes('status')) {
          return [
            { status: 'CONFIRMED', _count: { _all: 10 } },
            { status: 'COMPLETED', _count: { _all: 20 } },
            { status: 'PENDING', _count: { _all: 10 } },
          ];
        }
        // duplicates: one traveller booked the same session 3 times
        return [{ _count: { _all: 3 } }, { _count: { _all: 1 } }];
      }),
    },
    refundCase: {
      findMany: jest.fn(async () => [
        // initiated within 7 days
        { status: 'REFUND_COMPLETED', requestedAt: hoursAgo(240), initiatedAt: hoursAgo(200) },
        // initiated after 7 days
        { status: 'REFUND_INITIATED', requestedAt: hoursAgo(400), initiatedAt: hoursAgo(100) },
        // not initiated yet
        { status: 'REFUND_REQUESTED', requestedAt: hoursAgo(24), initiatedAt: null },
        // initiated within 7 days
        { status: 'AGENCY_ACTION_REQUIRED', requestedAt: hoursAgo(96), initiatedAt: hoursAgo(50) },
      ]),
      count: jest.fn(async ({ where }: any) => (where.disputedAt ? 1 : 1)), // disputes=1, overdue=1
    },
    externalPayment: {
      findMany: jest.fn(async () => [{ bookingId: 'b1', bankConfirmedAt: hoursAgo(2) }]),
    },
    paymentProof: {
      findMany: jest.fn(async () => [{ bookingId: 'b1', uploadedAt: hoursAgo(28) }]),
    },
    agencyProfile: { count: jest.fn(async () => 1) },
    auditLog: { count: jest.fn(async () => 2) },
  };
  return Object.assign(mock, overrides);
}

describe('BetaMetricsService', () => {
  it('derives the beta metrics and exit criteria from the stored data', async () => {
    const service = new BetaMetricsService(buildMock() as any);
    const m = await service.getBetaMetrics(undefined, undefined, NOW);

    expect(m.searches).toEqual({ total: 50, zeroResult: 5, zeroResultRate: 10 });
    expect(m.bookings.created).toBe(40);
    expect(m.bookings.completed).toBe(20);
    expect(m.bookings.byStatus).toEqual({ CONFIRMED: 10, COMPLETED: 20, PENDING: 10 });

    // 3 initiated, 2 within 7 days -> 66.7%
    expect(m.refunds.opened).toBe(4);
    expect(m.refunds.completed).toBe(1);
    expect(m.refunds.sla).toEqual({ initiated: 3, initiatedWithin7d: 2, percentWithin7d: 66.7 });
    expect(m.refunds.overdueNow).toBe(1);
    expect(m.refunds.proofToBankConfirmationLagHours).toEqual({ samples: 1, median: 26, average: 26 });

    expect(m.disputes).toEqual({ opened: 1, per1000Bookings: 25 });
    expect(m.stuck).toEqual({
      bookingsAwaitingValidationOver48h: 2,
      refundCasesPastDueOver48h: 1,
      total: 3,
    });
    expect(m.duplicates).toEqual({ duplicateBookings: 2, rate: 5 });
    expect(m.terms).toEqual({ nullTermsInWindow: 0, recordedRate: 100, nullTermsAllTime: 3 });
    expect(m.sweepPauses.agenciesCurrentlyPaused).toBe(1);
    expect(m.interventions).toEqual({ count: 2, per100Bookings: 5 });

    // support response is honestly marked non-derivable (email-based support)
    expect(m.support.derivable).toBe(false);
    expect(m.support.responseWithin48hPercent).toBeNull();

    const criteria = Object.fromEntries(m.exitCriteria.map((c) => [c.key, c]));
    expect(criteria.zeroResultRate).toMatchObject({ value: 10, pass: true });
    expect(criteria.refundSla).toMatchObject({ value: 66.7, pass: false });
    expect(criteria.disputesPer1000Bookings).toMatchObject({ value: 25, pass: true });
    expect(criteria.stuckStates).toMatchObject({ value: 3, pass: false });
    expect(criteria.duplicateBookings).toMatchObject({ value: 5, pass: false });
    expect(criteria.termsRecorded).toMatchObject({ value: 100, pass: true });
  });

  it('reports null rates (and null pass) when the window has no data', async () => {
    const empty: any = {
      searchEvent: { count: jest.fn(async () => 0) },
      booking: {
        count: jest.fn(async () => 0),
        groupBy: jest.fn(async () => []),
      },
      refundCase: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
      externalPayment: { findMany: jest.fn(async () => []) },
      paymentProof: { findMany: jest.fn(async () => []) },
      agencyProfile: { count: jest.fn(async () => 0) },
      auditLog: { count: jest.fn(async () => 0) },
    };
    const service = new BetaMetricsService(empty);
    const m = await service.getBetaMetrics(undefined, undefined, NOW);

    expect(m.searches.zeroResultRate).toBeNull();
    expect(m.disputes.per1000Bookings).toBeNull();
    expect(m.duplicates.rate).toBeNull();
    expect(m.terms.recordedRate).toBeNull();
    expect(m.refunds.proofToBankConfirmationLagHours).toEqual({ samples: 0, median: null, average: null });
    const criteria = Object.fromEntries(m.exitCriteria.map((c) => [c.key, c]));
    expect(criteria.zeroResultRate.pass).toBeNull();
    expect(criteria.refundSla.pass).toBeNull();
    // stuck is a point-in-time count: genuinely 0 passes even with no window data
    expect(criteria.stuckStates).toMatchObject({ value: 0, pass: true });
  });

  it('derives the support 48h first-response rate from help-centre tickets (#446)', async () => {
    const mock = buildMock({
      supportTicket: {
        findMany: jest.fn(async () => [
          // responded within 48h
          { status: 'RESOLVED', category: 'BOOKING', createdAt: hoursAgo(100), firstResponseAt: hoursAgo(80) },
          // responded after 48h
          { status: 'IN_PROGRESS', category: 'REFUND', createdAt: hoursAgo(200), firstResponseAt: hoursAgo(100) },
          // responded within 48h
          { status: 'RESOLVED', category: 'PAYMENT', createdAt: hoursAgo(50), firstResponseAt: hoursAgo(49) },
          // still open, older than 48h, no first response
          { status: 'OPEN', category: 'BOOKING', createdAt: hoursAgo(72), firstResponseAt: null },
        ]),
      },
    });
    const service = new BetaMetricsService(mock as any);
    const m = await service.getBetaMetrics(undefined, undefined, NOW);

    expect(m.support.derivable).toBe(true);
    // 2 of 3 responded tickets were answered within 48h
    expect(m.support.responseWithin48hPercent).toBe(66.7);
    expect(m.support.ticketsOpened).toBe(4);
    expect(m.support.ticketsWithFirstResponse).toBe(3);
    expect(m.support.firstResponsesWithin48h).toBe(2);
    expect(m.support.awaitingFirstResponseOver48h).toBe(1);
    expect(m.support.ticketsByCategory).toEqual({ BOOKING: 2, REFUND: 1, PAYMENT: 1 });
  });

  it('keeps support not-derivable when tickets exist but none has a first response (#446)', async () => {
    const mock = buildMock({
      supportTicket: {
        findMany: jest.fn(async () => [
          { status: 'OPEN', category: 'OTHER', createdAt: hoursAgo(5), firstResponseAt: null },
        ]),
      },
    });
    const service = new BetaMetricsService(mock as any);
    const m = await service.getBetaMetrics(undefined, undefined, NOW);
    expect(m.support.derivable).toBe(false);
    expect(m.support.responseWithin48hPercent).toBeNull();
    expect(m.support.ticketsOpened).toBe(1);
  });

  it('keeps support not-derivable when the ticket store cannot be read (#446 migration not applied)', async () => {
    const throwing = buildMock({
      supportTicket: {
        findMany: jest.fn(async () => {
          throw new Error('relation "SupportTicket" does not exist');
        }),
      },
    });
    const service = new BetaMetricsService(throwing as any);
    const m = await service.getBetaMetrics(undefined, undefined, NOW);
    expect(m.support.derivable).toBe(false);
    expect(m.support.responseWithin48hPercent).toBeNull();
    expect(m.support.reason).toContain('could not be read');
    // the rest of the metrics still resolve
    expect(m.bookings.created).toBe(40);
  });

  it('rejects an inverted window', async () => {
    const service = new BetaMetricsService(buildMock() as any);
    await expect(
      service.getBetaMetrics(new Date('2026-10-28T00:00:00Z'), new Date('2026-10-27T00:00:00Z'), NOW),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
