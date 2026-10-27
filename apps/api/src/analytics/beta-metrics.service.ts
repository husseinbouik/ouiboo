import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

/**
 * #432 / B21 (Council Session #2): beta measurement.
 *
 * Every number here is derived from existing operational tables (plus
 * the B21 SearchEvent log) — nothing is estimated and nothing is
 * invented. A metric that cannot be derived from stored data is
 * returned as `derivable: false` with the reason, never as a made-up
 * value. Definitions live in docs/launch-ops/BETA_METRICS.md; the
 * exit criteria below are the ones adopted for the closed beta:
 *
 *   zero-result search rate <= 20%
 *   refund SLA >= 95% of cases initiated within 7 days of request
 *   disputes <= 30 per 1,000 bookings
 *   zero stuck states unresolved > 48h
 *   duplicate bookings < 1%
 *   terms recorded on 100% of new bookings
 */

/** RefundCase statuses that still need work (refunds.util REFUND_ACTIVE_STATUSES). */
const REFUND_ACTIVE_STATUSES = [
  'REFUND_REQUESTED',
  'ELIGIBILITY_REVIEW',
  'REFUND_APPROVED',
  'AGENCY_ACTION_REQUIRED',
  'REFUND_INITIATED',
  'REFUND_FAILED',
  'REFUND_OVERDUE',
] as const;

/** AuditLog actions written by the #423 admin-intervention service. */
export const ADMIN_INTERVENTION_ACTIONS = [
  'ADMIN_BOOKING_REPAIRED',
  'ADMIN_GROUP_FORCE_CONFIRMED',
  'ADMIN_GROUP_CLOSED',
  'ADMIN_DEADLINE_EXTENDED',
] as const;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

function percent(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(value * 10) / 10;
}

@Injectable()
export class BetaMetricsService {
  constructor(private prisma: DatabaseService) {}

  async getBetaMetrics(fromInput?: Date, toInput?: Date, now: Date = new Date()) {
    const to = toInput ?? now;
    const from = fromInput ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Valid from/to dates are required');
    }
    if (from > to) {
      throw new BadRequestException('from must be before to');
    }
    const window = { gte: from, lte: to };
    const stuckCutoff = new Date(now.getTime() - FORTY_EIGHT_HOURS_MS);

    const [
      searchesTotal,
      searchesZeroResult,
      bookingsCreated,
      bookingsByStatus,
      nullTermsInWindow,
      nullTermsAllTime,
      refundCohort,
      overdueRefundCases,
      agenciesCurrentlyPaused,
      interventionCount,
      duplicateGroups,
    ] = await Promise.all([
      this.prisma.searchEvent.count({ where: { createdAt: window } }),
      this.prisma.searchEvent.count({ where: { createdAt: window, resultCount: 0 } }),
      this.prisma.booking.count({ where: { createdAt: window } }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { createdAt: window },
        _count: { _all: true },
      }),
      this.prisma.booking.count({ where: { createdAt: window, termsVersion: null } }),
      this.prisma.booking.count({ where: { termsVersion: null } }),
      this.prisma.refundCase.findMany({
        where: { requestedAt: window },
        select: { status: true, requestedAt: true, initiatedAt: true },
      }),
      this.prisma.refundCase.count({
        where: {
          status: { in: [...REFUND_ACTIVE_STATUSES] },
          refundDueAt: { lt: stuckCutoff },
        },
      }),
      this.prisma.agencyProfile.count({ where: { verificationPausedAt: { not: null } } }),
      this.prisma.auditLog.count({
        where: { action: { in: [...ADMIN_INTERVENTION_ACTIONS] }, createdAt: window },
      }),
      this.prisma.booking.groupBy({
        by: ['travelerId', 'sessionId'],
        where: { createdAt: window, status: { notIn: ['CANCELLED', 'REJECTED'] } },
        _count: { _all: true },
      }),
    ]);

    // --- searches / zero-result rate -------------------------------------
    const zeroResultRate = percent(searchesZeroResult, searchesTotal);

    // --- bookings ----------------------------------------------------------
    const byStatus: Record<string, number> = {};
    for (const row of bookingsByStatus as Array<{ status: string; _count: { _all: number } }>) {
      byStatus[row.status] = row._count._all;
    }
    const bookingsCompleted = byStatus['COMPLETED'] ?? 0;

    // --- refunds: SLA + status mix ----------------------------------------
    const refundByStatus: Record<string, number> = {};
    let initiated = 0;
    let initiatedWithin7d = 0;
    for (const c of refundCohort) {
      refundByStatus[c.status] = (refundByStatus[c.status] ?? 0) + 1;
      if (c.initiatedAt) {
        initiated += 1;
        if (c.initiatedAt.getTime() - c.requestedAt.getTime() <= SEVEN_DAYS_MS) {
          initiatedWithin7d += 1;
        }
      }
    }
    const refundSlaPercent = percent(initiatedWithin7d, initiated);
    const refundsCompleted = refundByStatus['REFUND_COMPLETED'] ?? 0;

    // --- disputes -----------------------------------------------------------
    const disputesOpened = await this.prisma.refundCase.count({
      where: { disputedAt: window },
    });
    const disputesPer1000 =
      bookingsCreated > 0 ? Math.round((disputesOpened / bookingsCreated) * 1000 * 10) / 10 : null;

    // --- proof upload -> bank confirmation lag ------------------------------
    const lagHours = await this.proofToBankLagHours(window);

    // --- stuck states (point in time, not windowed) --------------------------
    const stuckBookings = await this.prisma.booking.count({
      where: {
        status: { in: ['PENDING', 'AWAITING_VALIDATION'] },
        updatedAt: { lt: stuckCutoff },
      },
    });
    const stuckTotal = stuckBookings + overdueRefundCases;

    // --- duplicates (#494 canary) --------------------------------------------
    let duplicateBookings = 0;
    for (const g of duplicateGroups as Array<{ _count: { _all: number } }>) {
      if (g._count._all > 1) duplicateBookings += g._count._all - 1;
    }
    const duplicateRate = percent(duplicateBookings, bookingsCreated);

    // --- terms recording ------------------------------------------------------
    const termsRecordedRate =
      bookingsCreated > 0 ? Math.round((100 - (nullTermsInWindow / bookingsCreated) * 100) * 10) / 10 : null;

    // --- interventions ---------------------------------------------------------
    const interventionsPer100 =
      bookingsCreated > 0 ? Math.round((interventionCount / bookingsCreated) * 100 * 10) / 10 : null;

    return {
      window: { from: from.toISOString(), to: to.toISOString() },
      generatedAt: now.toISOString(),
      searches: {
        total: searchesTotal,
        zeroResult: searchesZeroResult,
        zeroResultRate,
      },
      bookings: {
        created: bookingsCreated,
        byStatus,
        completed: bookingsCompleted,
      },
      refunds: {
        opened: refundCohort.length,
        byStatus: refundByStatus,
        completed: refundsCompleted,
        sla: {
          initiated,
          initiatedWithin7d,
          percentWithin7d: refundSlaPercent,
        },
        overdueNow: overdueRefundCases,
        proofToBankConfirmationLagHours: lagHours,
      },
      disputes: {
        opened: disputesOpened,
        per1000Bookings: disputesPer1000,
      },
      stuck: {
        bookingsAwaitingValidationOver48h: stuckBookings,
        refundCasesPastDueOver48h: overdueRefundCases,
        total: stuckTotal,
      },
      duplicates: {
        duplicateBookings,
        rate: duplicateRate,
      },
      terms: {
        nullTermsInWindow,
        recordedRate: termsRecordedRate,
        nullTermsAllTime,
      },
      sweepPauses: {
        agenciesCurrentlyPaused,
        note: 'Point-in-time count. Historical pause events are not derivable: AgencyProfile.verificationPausedAt is a single overwritten field and no pause-history table exists.',
      },
      interventions: {
        count: interventionCount,
        per100Bookings: interventionsPer100,
      },
      support: {
        responseWithin48hPercent: null,
        derivable: false,
        reason:
          'Platform support runs over email (support@ouiboo.com, #419 split); no ticket or response timestamps are stored, so a 48h response rate cannot be derived from the database.',
      },
      exitCriteria: [
        {
          key: 'zeroResultRate',
          target: '<= 20% of searches return zero results',
          value: zeroResultRate,
          pass: zeroResultRate === null ? null : zeroResultRate <= 20,
        },
        {
          key: 'refundSla',
          target: '>= 95% of refund cases initiated within 7 days of request',
          value: refundSlaPercent,
          pass: refundSlaPercent === null ? null : refundSlaPercent >= 95,
        },
        {
          key: 'disputesPer1000Bookings',
          target: '<= 30 disputes per 1,000 bookings',
          value: disputesPer1000,
          pass: disputesPer1000 === null ? null : disputesPer1000 <= 30,
        },
        {
          key: 'stuckStates',
          target: '0 stuck states unresolved > 48h',
          value: stuckTotal,
          pass: stuckTotal === 0,
        },
        {
          key: 'duplicateBookings',
          target: '< 1% duplicate bookings',
          value: duplicateRate,
          pass: duplicateRate === null ? null : duplicateRate < 1,
        },
        {
          key: 'termsRecorded',
          target: 'terms recorded on 100% of new bookings',
          value: termsRecordedRate,
          pass: termsRecordedRate === null ? null : termsRecordedRate === 100,
        },
      ],
    };
  }

  /**
   * Median/average hours between a traveller's payment-proof upload and
   * the agency's bank confirmation, for payments bank-confirmed in the
   * window. Sample = ExternalPayments with a bank confirmation stamp;
   * the upload side is the booking's single PaymentProof row.
   */
  private async proofToBankLagHours(window: { gte: Date; lte: Date }) {
    const confirmed = await this.prisma.externalPayment.findMany({
      where: { bankConfirmedAt: window },
      select: { bookingId: true, bankConfirmedAt: true },
    });
    if (confirmed.length === 0) {
      return { samples: 0, median: null as number | null, average: null as number | null };
    }
    const proofs = await this.prisma.paymentProof.findMany({
      where: { bookingId: { in: confirmed.map((c) => c.bookingId) } },
      select: { bookingId: true, uploadedAt: true },
    });
    const uploadedAtByBooking = new Map(proofs.map((p) => [p.bookingId, p.uploadedAt]));
    const lags: number[] = [];
    for (const c of confirmed) {
      const uploadedAt = uploadedAtByBooking.get(c.bookingId);
      if (!uploadedAt || !c.bankConfirmedAt) continue;
      const lag = (c.bankConfirmedAt.getTime() - uploadedAt.getTime()) / (60 * 60 * 1000);
      if (lag >= 0) lags.push(lag);
    }
    const average =
      lags.length > 0 ? Math.round((lags.reduce((a, b) => a + b, 0) / lags.length) * 10) / 10 : null;
    return { samples: lags.length, median: median(lags), average };
  }
}
