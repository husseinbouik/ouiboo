import { BadRequestException } from '@nestjs/common';
import { LeakageDetectionService } from './leakage-detection.service';

/**
 * #444 (Council P2-05): fee-capture detection, pinned against mock
 * rows shaped like the real tables. The billable predicate mirrors
 * the invoice generator (PAID + confirmedAt in window); capture means
 * an InvoiceLineItem exists for the booking.
 */
const NOW = new Date('2026-10-27T12:00:00.000Z');
const FROM = new Date('2026-09-01T00:00:00.000Z');
const TO = new Date('2026-10-27T12:00:00.000Z');

function bookingRow(overrides: Record<string, any> = {}) {
  return {
    id: 'b1',
    totalAmount: '2000.00',
    currency: 'MAD',
    confirmedAt: new Date('2026-09-10T10:00:00.000Z'), // September: closed period at NOW
    travelerId: 't1',
    status: 'COMPLETED',
    session: { endDate: new Date('2026-06-01T00:00:00.000Z'), template: { agencyId: 'a1' } },
    ...overrides,
  };
}

function buildMock({
  billable = [] as any[],
  capturedIds = [] as string[],
  pairBookings = [] as any[],
  auditRows = [] as any[],
} = {}) {
  return {
    booking: {
      findMany: jest.fn(async ({ where }: any) => {
        // fee-capture query is the one filtered on paymentStatus
        if (where.paymentStatus === 'PAID') return billable;
        return pairBookings;
      }),
    },
    invoiceLineItem: {
      findMany: jest.fn(async () => capturedIds.map((bookingId) => ({ bookingId }))),
    },
    auditLog: {
      findMany: jest.fn(async () => auditRows),
    },
  };
}

describe('LeakageDetectionService (#444)', () => {
  it('reconciles billable bookings against invoice line items and splits closed vs open periods', async () => {
    const mock = buildMock({
      billable: [
        bookingRow({ id: 'b1' }), // captured
        bookingRow({ id: 'b2', totalAmount: '1000.00' }), // September, uncaptured -> closed-period leak
        bookingRow({
          id: 'b3',
          totalAmount: '500.00',
          confirmedAt: new Date('2026-10-05T10:00:00.000Z'), // October: still open at NOW
        }),
      ],
      capturedIds: ['b1'],
    });
    const service = new LeakageDetectionService(mock as any);
    const report = await service.getLeakageReport(FROM, TO, NOW);

    expect(report.feeCapture.billableBookings).toBe(3);
    expect(report.feeCapture.capturedBookings).toBe(1);
    expect(report.feeCapture.captureRatePercent).toBe(33.3);
    expect(report.feeCapture.targetPercent).toBe(98);
    expect(report.feeCapture.meetsTarget).toBe(false);
    expect(report.feeCapture.uncapturedClosedPeriod.count).toBe(1);
    expect(report.feeCapture.uncapturedClosedPeriod.grossByCurrency).toEqual({ MAD: '1000.00' });
    expect(report.feeCapture.uncapturedClosedPeriod.bookings).toEqual([
      expect.objectContaining({ bookingId: 'b2', agencyId: 'a1', totalAmount: '1000.00' }),
    ]);
    expect(report.feeCapture.awaitingInvoice.count).toBe(1);
    expect(report.feeCapture.awaitingInvoice.grossByCurrency).toEqual({ MAD: '500.00' });
  });

  it('reports a null capture rate (not 0 or 100) when nothing was billable', async () => {
    const service = new LeakageDetectionService(buildMock() as any);
    const report = await service.getLeakageReport(FROM, TO, NOW);

    expect(report.feeCapture.billableBookings).toBe(0);
    expect(report.feeCapture.captureRatePercent).toBeNull();
    expect(report.feeCapture.meetsTarget).toBeNull();
  });

  it('counts repeat pairs and the at-risk single-booking cohort', async () => {
    const old = new Date('2026-06-01T00:00:00.000Z'); // > 90 days before NOW
    const recent = new Date('2026-10-20T00:00:00.000Z');
    const pairBookings = [
      // repeat pair: t1 x a1, two bookings
      bookingRow({ id: 'p1', travelerId: 't1' }),
      bookingRow({ id: 'p2', travelerId: 't1' }),
      // at-risk pair: t2 x a1, one completed trip long ago
      bookingRow({ id: 'p3', travelerId: 't2', session: { endDate: old, template: { agencyId: 'a1' } } }),
      // single pair but recent trip: not at risk
      bookingRow({ id: 'p4', travelerId: 't3', session: { endDate: recent, template: { agencyId: 'a2' } } }),
      // single pair, booking not completed: not at risk
      bookingRow({ id: 'p5', travelerId: 't4', status: 'CONFIRMED', session: { endDate: old, template: { agencyId: 'a2' } } }),
    ];
    const service = new LeakageDetectionService(buildMock({ pairBookings }) as any);
    const report = await service.getLeakageReport(FROM, TO, NOW);

    expect(report.rebooking.pairs).toBe(4);
    expect(report.rebooking.repeatPairs).toBe(1);
    expect(report.rebooking.repeatPairRatePercent).toBe(25);
    expect(report.rebooking.singleBookingPairs).toBe(3);
    expect(report.rebooking.atRiskPairs.count).toBe(1);
    expect(report.rebooking.atRiskPairs.pairs[0]).toMatchObject({ travelerId: 't2', agencyId: 'a1' });
    expect(report.rebooking.atRiskPairs.pairs[0].daysSinceTripEnd).toBeGreaterThan(90);
  });

  it('tallies pre-booking contact-exchange detections by category', async () => {
    const auditRows = [
      { metadata: { categories: ['PHONE'], phase: 'PRE_BOOKING', senderRole: 'TRAVELER' } },
      { metadata: { categories: ['PHONE', 'BANK_DETAILS'], phase: 'PRE_BOOKING', senderRole: 'AGENCY' } },
      { metadata: null },
    ];
    const service = new LeakageDetectionService(buildMock({ auditRows }) as any);
    const report = await service.getLeakageReport(FROM, TO, NOW);

    expect(report.contactExchange.flaggedMessages).toBe(3);
    expect(report.contactExchange.byCategory).toEqual({ PHONE: 2, BANK_DETAILS: 1 });
  });

  it('rejects an inverted or invalid window', async () => {
    const service = new LeakageDetectionService(buildMock() as any);
    await expect(service.getLeakageReport(TO, FROM, NOW)).rejects.toThrow(BadRequestException);
    await expect(service.getLeakageReport(new Date('not-a-date'), TO, NOW)).rejects.toThrow(
      BadRequestException,
    );
  });
});
