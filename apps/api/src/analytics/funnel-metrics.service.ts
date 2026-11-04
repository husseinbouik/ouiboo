import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

/**
 * #756: consented funnel measurement — the SERVER-side readout.
 *
 * Every number is an aggregate count derived from operational rows the
 * platform already keeps (SearchEvent, Booking, ExternalPayment,
 * RefundCase) — nothing new is collected, no per-traveller journey is
 * built, and the payload carries counts and rates ONLY: no identifiers,
 * no free text, no search strings, no money, no payment facts beyond
 * the confirmation count. The taxonomy + privacy contract live in
 * docs/funnel-measurement.md; steps the server cannot truthfully
 * observe (trip detail views, session selection, checkout starts) are
 * client-side and DEFERRED there — they are absent here rather than
 * estimated.
 *
 * Idempotency: derivation from state rows means re-running the readout
 * can never double-count; a booking contributes to a step exactly when
 * its recorded state says it reached it.
 */

function percent(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

@Injectable()
export class FunnelMetricsService {
  constructor(private prisma: DatabaseService) {}

  async getFunnelMetrics(fromInput?: Date, toInput?: Date, now: Date = new Date()) {
    const to = toInput ?? now;
    const from = fromInput ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Valid from/to dates are required');
    }
    if (from > to) {
      throw new BadRequestException('from must be before to');
    }
    const window = { gte: from, lte: to };
    const cohort = { createdAt: window };

    const [
      searchesTotal,
      searchesZeroResult,
      bookingsCreated,
      bookingsByStatus,
      proofsSubmitted,
      proofsPending,
      confirmedBookings,
      bankConfirmedPayments,
      refundCasesByStatus,
    ] = await Promise.all([
      this.prisma.searchEvent.count({ where: { createdAt: window } }),
      this.prisma.searchEvent.count({ where: { createdAt: window, resultCount: 0 } }),
      this.prisma.booking.count({ where: cohort }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: cohort,
        _count: { _all: true },
      }),
      this.prisma.booking.count({ where: { ...cohort, paymentProofId: { not: null } } }),
      this.prisma.booking.count({ where: { ...cohort, status: 'AWAITING_VALIDATION' } }),
      this.prisma.booking.count({ where: { ...cohort, confirmedAt: { not: null } } }),
      this.prisma.externalPayment.findMany({
        where: { bankConfirmedAt: { not: null }, booking: { createdAt: window } },
        select: { bookingId: true },
      }),
      this.prisma.refundCase.groupBy({
        by: ['status'],
        where: { requestedAt: window },
        _count: { _all: true },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of bookingsByStatus as Array<{ status: string; _count: { _all: number } }>) {
      byStatus[row.status] = row._count._all;
    }
    const refundByStatus: Record<string, number> = {};
    let refundCasesTotal = 0;
    for (const row of refundCasesByStatus as Array<{ status: string; _count: { _all: number } }>) {
      refundByStatus[row.status] = row._count._all;
      refundCasesTotal += row._count._all;
    }
    // Distinct cohort bookings with at least one bank-confirmed payment.
    const bankConfirmedBookings = new Set(
      (bankConfirmedPayments as Array<{ bookingId: string }>).map((p) => p.bookingId),
    ).size;

    const completed = byStatus['COMPLETED'] ?? 0;
    const cancelled = byStatus['CANCELLED'] ?? 0;

    return {
      window: { from: from.toISOString(), to: to.toISOString() },
      generatedAt: now.toISOString(),
      steps: {
        searches: searchesTotal,
        searchesZeroResult,
        bookingsCreated,
        proofsSubmitted,
        proofsPending,
        bankConfirmedBookings,
        confirmedBookings,
        completedBookings: completed,
        cancelledBookings: cancelled,
      },
      bookingsByStatus: byStatus,
      refunds: {
        total: refundCasesTotal,
        byStatus: refundByStatus,
      },
      conversions: {
        zeroResultRatePercent: percent(searchesZeroResult, searchesTotal),
        bookingPerSearchPercent: percent(bookingsCreated, searchesTotal),
        proofPerBookingPercent: percent(proofsSubmitted, bookingsCreated),
        bankConfirmedPerProofPercent: percent(bankConfirmedBookings, proofsSubmitted),
        confirmedPerBookingPercent: percent(confirmedBookings, bookingsCreated),
        completedPerConfirmedPercent: percent(completed, confirmedBookings),
        cancelledPerBookingPercent: percent(cancelled, bookingsCreated),
      },
    };
  }
}
