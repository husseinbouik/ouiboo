import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { decimalZero, toMoneyDecimal, toMoneyString } from '../common/money.util';
import { CONTACT_EXCHANGE_AUDIT_ACTION } from '../messages/contact-exchange.util';

/**
 * #444 (Council P2-05): leakage defences — fee-capture detection.
 *
 * Leakage on Ouiboo is structural: at booking #1 the traveller and the
 * agency exchange contact details and the agency RIB BY DESIGN (the
 * traveller pays the agency directly). Every later trip the pair takes
 * off-platform is a booking the platform never sees and a platform
 * service fee it never captures. Off-platform transactions are not
 * directly observable, so this report measures the three signals that
 * ARE derivable from stored data — and labels them as signals, never
 * as proof of a specific off-platform trip:
 *
 * 1. Fee capture. The billable cohort (the exact predicate the invoice
 *    generator uses: paymentStatus PAID with confirmedAt in the
 *    window) reconciled against InvoiceLineItem rows. A billable
 *    booking whose invoice period has CLOSED with no line item is
 *    uncaptured fee — the detection the council asked for. Bookings
 *    in a still-open period are reported separately as awaiting
 *    invoice: monthly generation may simply not have run yet.
 *    Target: capture rate >= 98% (the QA beta exit threshold, P1-05).
 *
 * 2. Rebooking. Traveller–agency pairs are the unit leakage acts on.
 *    The report counts pairs, repeat pairs (>= 2 live bookings), and
 *    the at-risk cohort: pairs with exactly one COMPLETED booking
 *    whose trip ended more than 90 days ago and who never booked
 *    again on-platform. That cohort holds the contacts and the RIB;
 *    it is where rebooking value (and any future retention work)
 *    has to land. A pair in the cohort may simply not have travelled
 *    again — the signal prioritises, it does not accuse.
 *
 * 3. Contact exchange. Pre-booking contact-exchange detections
 *    recorded by MessagesService (categories only, never content):
 *    attempts to move a FIRST booking off-platform before it exists.
 *
 * Definitions are written for the operator in
 * docs/launch-ops/LEAKAGE_DEFENCES.md. While the closed beta is free
 * there is no fee to capture (monetisation gate #426), so the fee
 * section reads as plumbing verification until fees switch on: every
 * number is still computed from the real tables, never estimated.
 */

export const FEE_CAPTURE_TARGET_PERCENT = 98;
export const REBOOKING_RISK_WINDOW_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;
const LIST_CAP = 50;

function percent(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

type MoneyTotals = Record<string, ReturnType<typeof decimalZero>>;

function addMoney(totals: MoneyTotals, currency: string, amount: unknown): void {
  const key = currency || 'MAD';
  totals[key] = (totals[key] ?? decimalZero()).add(toMoneyDecimal(amount as never, 'totalAmount'));
}

function serializeTotals(totals: MoneyTotals): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [currency, value] of Object.entries(totals)) {
    out[currency] = toMoneyString(value) || '0.00';
  }
  return out;
}

@Injectable()
export class LeakageDetectionService {
  constructor(private prisma: DatabaseService) {}

  async getLeakageReport(fromInput?: Date, toInput?: Date, now: Date = new Date()) {
    const to = toInput ?? now;
    const from = fromInput ?? new Date(to.getTime() - 30 * DAY_MS);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Valid from/to dates are required');
    }
    if (from > to) {
      throw new BadRequestException('from must be before to');
    }
    const window = { gte: from, lte: to };

    const [feeCapture, rebooking, contactExchange] = await Promise.all([
      this.feeCaptureSection(window, now),
      this.rebookingSection(to, now),
      this.contactExchangeSection(window),
    ]);

    return {
      window: { from: from.toISOString(), to: to.toISOString() },
      generatedAt: now.toISOString(),
      feeCapture,
      rebooking,
      contactExchange,
    };
  }

  /**
   * Billable bookings (invoice-generator predicate) reconciled against
   * the invoice line items that captured them.
   */
  private async feeCaptureSection(window: { gte: Date; lte: Date }, now: Date) {
    const billable = await this.prisma.booking.findMany({
      where: { paymentStatus: 'PAID', confirmedAt: window },
      select: {
        id: true,
        totalAmount: true,
        currency: true,
        confirmedAt: true,
        session: { select: { template: { select: { agencyId: true } } } },
      },
      orderBy: [{ confirmedAt: 'asc' }, { id: 'asc' }],
    });

    const billableIds = billable.map((b: any) => b.id);
    const lineItems =
      billableIds.length > 0
        ? await this.prisma.invoiceLineItem.findMany({
            where: { bookingId: { in: billableIds } },
            select: { bookingId: true },
          })
        : [];
    const capturedIds = new Set(lineItems.map((line: any) => line.bookingId));

    const capturedBookings = billable.filter((b: any) => capturedIds.has(b.id));
    const uncaptured = billable.filter((b: any) => !capturedIds.has(b.id));

    // A booking's invoice period is the UTC calendar month of its
    // confirmation (the generator's period definition). The period is
    // closed once its end is in the past; only then is "no line item"
    // a capture failure rather than "not generated yet".
    const uncapturedClosed: any[] = [];
    const awaitingInvoice: any[] = [];
    for (const booking of uncaptured) {
      // The billable predicate filters confirmedAt into the window, so
      // it is always set here; the cast only satisfies the nullable
      // column type.
      const confirmedAt = new Date(booking.confirmedAt as Date);
      const periodEnd = new Date(
        Date.UTC(confirmedAt.getUTCFullYear(), confirmedAt.getUTCMonth() + 1, 1),
      );
      (periodEnd <= now ? uncapturedClosed : awaitingInvoice).push(booking);
    }

    const closedTotals: MoneyTotals = {};
    for (const booking of uncapturedClosed) {
      addMoney(closedTotals, booking.currency, booking.totalAmount);
    }
    const awaitingTotals: MoneyTotals = {};
    for (const booking of awaitingInvoice) {
      addMoney(awaitingTotals, booking.currency, booking.totalAmount);
    }

    const captureRatePercent = percent(capturedBookings.length, billable.length);

    return {
      billableBookings: billable.length,
      capturedBookings: capturedBookings.length,
      captureRatePercent,
      targetPercent: FEE_CAPTURE_TARGET_PERCENT,
      meetsTarget: captureRatePercent === null ? null : captureRatePercent >= FEE_CAPTURE_TARGET_PERCENT,
      uncapturedClosedPeriod: {
        count: uncapturedClosed.length,
        grossByCurrency: serializeTotals(closedTotals),
        bookings: uncapturedClosed.slice(0, LIST_CAP).map((b: any) => ({
          bookingId: b.id,
          agencyId: b.session.template.agencyId,
          confirmedAt: new Date(b.confirmedAt).toISOString(),
          totalAmount: toMoneyString(b.totalAmount) || '0.00',
          currency: b.currency || 'MAD',
        })),
      },
      awaitingInvoice: {
        count: awaitingInvoice.length,
        grossByCurrency: serializeTotals(awaitingTotals),
        note: 'Billable bookings in a still-open period, or whose monthly invoice has not been generated yet. Not a capture failure.',
      },
    };
  }

  /**
   * Traveller–agency pair analysis over every live booking up to `to`.
   */
  private async rebookingSection(to: Date, now: Date) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        createdAt: { lte: to },
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      },
      select: {
        travelerId: true,
        status: true,
        session: {
          select: {
            endDate: true,
            template: { select: { agencyId: true } },
          },
        },
      },
    });

    type Pair = {
      travelerId: string;
      agencyId: string;
      bookings: number;
      lastCompletedTripEnd: Date | null;
    };
    const pairs = new Map<string, Pair>();
    for (const booking of bookings as any[]) {
      const agencyId = booking.session.template.agencyId;
      const key = `${booking.travelerId}|${agencyId}`;
      let pair = pairs.get(key);
      if (!pair) {
        pair = { travelerId: booking.travelerId, agencyId, bookings: 0, lastCompletedTripEnd: null };
        pairs.set(key, pair);
      }
      pair.bookings += 1;
      if (booking.status === 'COMPLETED' && booking.session.endDate) {
        const end = new Date(booking.session.endDate);
        if (!pair.lastCompletedTripEnd || end > pair.lastCompletedTripEnd) {
          pair.lastCompletedTripEnd = end;
        }
      }
    }

    const allPairs = [...pairs.values()];
    const repeatPairs = allPairs.filter((p) => p.bookings >= 2);
    const singleBookingPairs = allPairs.filter((p) => p.bookings === 1);
    const riskCutoff = new Date(now.getTime() - REBOOKING_RISK_WINDOW_DAYS * DAY_MS);
    const atRisk = singleBookingPairs
      .filter((p) => p.lastCompletedTripEnd && p.lastCompletedTripEnd < riskCutoff)
      .sort(
        (a, b) =>
          (a.lastCompletedTripEnd as Date).getTime() - (b.lastCompletedTripEnd as Date).getTime(),
      );

    return {
      pairs: allPairs.length,
      repeatPairs: repeatPairs.length,
      repeatPairRatePercent: percent(repeatPairs.length, allPairs.length),
      singleBookingPairs: singleBookingPairs.length,
      atRiskPairs: {
        count: atRisk.length,
        riskWindowDays: REBOOKING_RISK_WINDOW_DAYS,
        pairs: atRisk.slice(0, LIST_CAP).map((p) => ({
          travelerId: p.travelerId,
          agencyId: p.agencyId,
          lastCompletedTripEnd: (p.lastCompletedTripEnd as Date).toISOString(),
          daysSinceTripEnd: Math.floor(
            (now.getTime() - (p.lastCompletedTripEnd as Date).getTime()) / DAY_MS,
          ),
        })),
        note: 'Pairs whose only completed trip ended over 90 days ago with no on-platform rebooking. They hold the agency contacts and RIB by design; the signal prioritises rebooking value, it does not prove an off-platform trip.',
      },
    };
  }

  /**
   * Pre-booking contact-exchange detections (AuditLog, categories only).
   */
  private async contactExchangeSection(window: { gte: Date; lte: Date }) {
    const rows = await this.prisma.auditLog.findMany({
      where: { action: CONTACT_EXCHANGE_AUDIT_ACTION, createdAt: window },
      select: { metadata: true },
    });
    const byCategory: Record<string, number> = {};
    for (const row of rows as any[]) {
      const categories =
        row.metadata && typeof row.metadata === 'object' && Array.isArray(row.metadata.categories)
          ? row.metadata.categories
          : [];
      for (const category of categories) {
        byCategory[category] = (byCategory[category] ?? 0) + 1;
      }
    }
    return {
      flaggedMessages: rows.length,
      byCategory,
      note: 'Messages flagged before any booking existed between the pair. Flagged messages are delivered; the flag is a detection signal, not a block.',
    };
  }
}
