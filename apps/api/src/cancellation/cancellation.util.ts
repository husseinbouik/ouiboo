import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';

/**
 * #417 (Council P0-11) — the platform cancellation scale.
 *
 * Three layers, in order:
 *
 * 1. THE FLOOR (platform-wide, lives in the Traveller Terms): when the
 *    cancellation is the agency's fault, or a minimum-group trip does not
 *    run because the minimum was not reached, the traveller is refunded
 *    100% of everything actually paid, and the refund must be INITIATED
 *    within 7 days. The initiation deadline is not new machinery: it is
 *    the RefundCase SLA (RefundsService.refundDueAt, 7 days by default —
 *    see refunds.util.refundAgencyActionDays). No agency band may ever
 *    undercut the floor, so the floor triggers bypass the bands entirely.
 *
 * 2. AGENCY PER-TRIP BANDS for traveller-initiated cancellations, stored
 *    as structured data on TripTemplate.cancellationPolicy
 *    ({ version, bands: [{ minDaysBeforeStart, refundPercent }] }),
 *    validated on write, and resolved here in code. A trip with no
 *    stored bands uses PLATFORM_DEFAULT_CANCELLATION_BANDS, so a scale
 *    exists for every trip (today no scale exists anywhere).
 *
 * 3. A SNAPSHOT of the resolved scale on the Booking at creation time
 *    (Booking.cancellationScale), so an agency editing its template later
 *    can never rewrite the terms a traveller already booked under.
 *
 * Money never moves through OuiBoo: percentages apply to amounts the
 * traveller actually paid the AGENCY / its provider (verified
 * ExternalPayments), and the resulting RefundCase is executed by the
 * agency under the #370/#416 rules. Nothing here creates refund evidence
 * or implies OuiBoo holds traveller money.
 */

export const CANCELLATION_POLICY_VERSION = 'cancellation-v1';

/** The floor: agency fault and minimum-unmet always refund in full. */
export const CANCELLATION_FLOOR_REFUND_PERCENT = 100;

/**
 * The floor's initiation deadline, in calendar days. Mirrors the
 * RefundCase agency-action SLA default (refunds.util
 * refundAgencyActionDays, REFUND_AGENCY_ACTION_DAYS) so the Terms, the
 * snapshot and the enforced deadline cannot drift apart silently.
 */
export const CANCELLATION_REFUND_INITIATION_DAYS = 7;

/** Eligibility-rule markers recorded on RefundCase.eligibilityRule. */
export const CANCELLATION_RULE_AGENCY_FAULT = 'AGENCY_FAULT_FULL_REFUND';
export const CANCELLATION_RULE_MINIMUM_NOT_REACHED =
    'MINIMUM_GROUP_NOT_REACHED_DEPOSIT_REFUNDABLE';

export interface CancellationBand {
    /** Whole days before the session start at which this band begins. */
    minDaysBeforeStart: number;
    /** Percent of the amount actually paid that is refunded. */
    refundPercent: number;
}

export interface CancellationScale {
    version: string;
    bands: CancellationBand[];
}

/** The resolved scale as snapshotted on a booking / shown pre-payment. */
export interface CancellationScaleSnapshot extends CancellationScale {
    floorRefundPercent: number;
    refundInitiationDays: number;
}

export type CancellationTrigger = 'TRAVELLER' | 'AGENCY_FAULT' | 'MINIMUM_NOT_REACHED';

/**
 * Platform default bands for traveller-initiated cancellations, applied
 * when an agency has not set its own. Founder-adjustable policy values:
 * free cancellation a month out, tapering to no refund in the last
 * 3 days.
 */
export const PLATFORM_DEFAULT_CANCELLATION_BANDS: CancellationBand[] = [
    { minDaysBeforeStart: 30, refundPercent: 100 },
    { minDaysBeforeStart: 15, refundPercent: 75 },
    { minDaysBeforeStart: 7, refundPercent: 50 },
    { minDaysBeforeStart: 3, refundPercent: 25 },
    { minDaysBeforeStart: 0, refundPercent: 0 },
];

export const MAX_CANCELLATION_BANDS = 10;
const MAX_BAND_MIN_DAYS = 365;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidBandShape(value: unknown): value is CancellationBand {
    if (!isRecord(value)) {
        return false;
    }
    const { minDaysBeforeStart, refundPercent } = value;
    return (
        Number.isInteger(minDaysBeforeStart)
        && (minDaysBeforeStart as number) >= 0
        && (minDaysBeforeStart as number) <= MAX_BAND_MIN_DAYS
        && Number.isInteger(refundPercent)
        && (refundPercent as number) >= 0
        && (refundPercent as number) <= 100
    );
}

/** Bands sorted by threshold, highest first (the lookup order). */
export function sortCancellationBands(bands: CancellationBand[]): CancellationBand[] {
    return [...bands].sort((a, b) => b.minDaysBeforeStart - a.minDaysBeforeStart);
}

/**
 * Semantic rules for an agency-supplied band list (shape is checked
 * separately). Returns a human-readable error, or null when valid.
 * Coverage must reach 0 days so every possible cancellation timing
 * resolves to exactly one band.
 */
export function cancellationBandsError(bands: CancellationBand[]): string | null {
    if (bands.length === 0) {
        return 'A cancellation scale needs at least one band';
    }
    if (bands.length > MAX_CANCELLATION_BANDS) {
        return `A cancellation scale may have at most ${MAX_CANCELLATION_BANDS} bands`;
    }
    const thresholds = new Set<number>();
    for (const band of bands) {
        if (thresholds.has(band.minDaysBeforeStart)) {
            return `Duplicate cancellation band for ${band.minDaysBeforeStart} days before the trip`;
        }
        thresholds.add(band.minDaysBeforeStart);
    }
    if (!thresholds.has(0)) {
        return 'A cancellation scale must include a band starting at 0 days before the trip, so every cancellation timing is covered';
    }
    return null;
}

/**
 * Strictly parse stored scale JSON. Returns null for anything malformed
 * (wrong shape, out-of-range values, or bands failing the semantic
 * rules) — callers then fall back to the platform defaults rather than
 * trusting stored data blindly.
 */
export function parseCancellationScale(raw: unknown): CancellationScale | null {
    if (!isRecord(raw) || !Array.isArray(raw.bands) || raw.bands.length === 0) {
        return null;
    }
    if (!raw.bands.every(isValidBandShape)) {
        return null;
    }
    const bands = sortCancellationBands(
        raw.bands.map((band) => ({
            minDaysBeforeStart: band.minDaysBeforeStart,
            refundPercent: band.refundPercent,
        })),
    );
    if (cancellationBandsError(bands)) {
        return null;
    }
    return { version: CANCELLATION_POLICY_VERSION, bands };
}

/**
 * Validate and normalize an agency-supplied policy on write (template
 * create/update). Throws BadRequestException on any violation — an
 * agency can never store a scale that undercuts the floor, because the
 * floor triggers never consult the bands at all.
 */
export function normalizeCancellationPolicyInput(input: unknown): CancellationScale {
    if (!isRecord(input) || !Array.isArray(input.bands)) {
        throw new BadRequestException('cancellationPolicy.bands must be an array of bands');
    }
    if (!input.bands.every(isValidBandShape)) {
        throw new BadRequestException(
            'Each cancellation band needs an integer minDaysBeforeStart between 0 and 365 and an integer refundPercent between 0 and 100',
        );
    }
    const bands = sortCancellationBands(
        input.bands.map((band: CancellationBand) => ({
            minDaysBeforeStart: band.minDaysBeforeStart,
            refundPercent: band.refundPercent,
        })),
    );
    const error = cancellationBandsError(bands);
    if (error) {
        throw new BadRequestException(error);
    }
    return { version: CANCELLATION_POLICY_VERSION, bands };
}

/** The effective scale for a trip: its stored bands, or the defaults. */
export function resolveCancellationScale(raw: unknown): CancellationScale {
    return (
        parseCancellationScale(raw) ?? {
            version: CANCELLATION_POLICY_VERSION,
            bands: sortCancellationBands([...PLATFORM_DEFAULT_CANCELLATION_BANDS]),
        }
    );
}

/** The full display/snapshot shape: resolved bands + the floor terms. */
export function buildCancellationScaleSnapshot(raw: unknown): CancellationScaleSnapshot {
    const scale = resolveCancellationScale(raw);
    return {
        ...scale,
        floorRefundPercent: CANCELLATION_FLOOR_REFUND_PERCENT,
        refundInitiationDays: CANCELLATION_REFUND_INITIATION_DAYS,
    };
}

/**
 * #687 (Council S6): the ONE standardised free-cancellation definition
 * behind the one-line merchandising summary and the search filter.
 * A trip offers "free cancellation" exactly when its scale's best
 * (highest-threshold) 100%-refund band starts at least this many whole
 * days before the trip starts. The indexed TripTemplate columns
 * (freeCancellation / freeCancellationDays) are derived with this same
 * function on every write, so card, hero, booking box and filter can
 * never disagree.
 */
export const FREE_CANCELLATION_MIN_DAYS = 1;

export interface CancellationSummary {
    freeCancellation: boolean;
    /** Threshold (days before start) of the free tier, when one exists. */
    freeCancellationDays: number | null;
    /** The best refund percent the scale offers (its top band). */
    bestRefundPercent: number;
}

/** Derive the #687 summary from a resolved scale (or stored policy JSON). */
export function summarizeCancellation(raw: unknown): CancellationSummary {
    const scale = resolveCancellationScale(raw);
    const sorted = sortCancellationBands(scale.bands);
    const freeBand = sorted.find((band) => band.refundPercent === 100) ?? null;
    const freeCancellationDays =
        freeBand && freeBand.minDaysBeforeStart >= FREE_CANCELLATION_MIN_DAYS
            ? freeBand.minDaysBeforeStart
            : null;
    return {
        freeCancellation: freeCancellationDays !== null,
        freeCancellationDays,
        bestRefundPercent: sorted.reduce((max, band) => Math.max(max, band.refundPercent), 0),
    };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days between the cancellation moment and the session start.
 * Exactly 30×24h before start = 30 days (the band applies); 1ms later
 * = 29 days. Negative once the trip has started.
 */
export function wholeDaysBeforeStart(sessionStart: Date, at: Date): number {
    return Math.floor((sessionStart.getTime() - at.getTime()) / DAY_MS);
}

/** The band covering a timing (bands must be coverage-complete). */
export function cancellationBandForDays(
    bands: CancellationBand[],
    daysBeforeStart: number,
): CancellationBand {
    const sorted = sortCancellationBands(bands);
    const days = Math.max(daysBeforeStart, 0);
    for (const band of sorted) {
        if (days >= band.minDaysBeforeStart) {
            return band;
        }
    }
    // Unreachable for validated scales (a 0-day band always exists);
    // fall back to the lowest band rather than inventing a refund.
    return sorted[sorted.length - 1];
}

export interface CancellationRefundComputation {
    percent: number;
    /** Refund amount, money-quantized to 2 decimal places (half-up). */
    amount: Prisma.Decimal;
    /** Machine-readable rule recorded on the RefundCase. */
    rule: string;
    band: CancellationBand | null;
    daysBeforeStart: number;
}

/**
 * Compute the refund a cancellation produces. The floor triggers
 * (agency fault, minimum not reached) always yield 100% of the amount
 * actually paid and never consult the bands; a traveller cancellation
 * resolves through the bands of the booking's scale.
 */
export function computeCancellationRefund(args: {
    paidAmount: Prisma.Decimal;
    sessionStart: Date;
    cancelledAt: Date;
    scale: CancellationScale;
    trigger: CancellationTrigger;
}): CancellationRefundComputation {
    const daysBeforeStart = wholeDaysBeforeStart(args.sessionStart, args.cancelledAt);
    if (args.trigger === 'AGENCY_FAULT') {
        return {
            percent: CANCELLATION_FLOOR_REFUND_PERCENT,
            amount: args.paidAmount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
            rule: CANCELLATION_RULE_AGENCY_FAULT,
            band: null,
            daysBeforeStart,
        };
    }
    if (args.trigger === 'MINIMUM_NOT_REACHED') {
        return {
            percent: CANCELLATION_FLOOR_REFUND_PERCENT,
            amount: args.paidAmount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
            rule: CANCELLATION_RULE_MINIMUM_NOT_REACHED,
            band: null,
            daysBeforeStart,
        };
    }
    const band = cancellationBandForDays(args.scale.bands, daysBeforeStart);
    const amount = args.paidAmount
        .mul(band.refundPercent)
        .div(100)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    return {
        percent: band.refundPercent,
        amount,
        rule: `CANCELLATION_SCALE_BAND_${band.minDaysBeforeStart}D_${band.refundPercent}PCT`,
        band,
        daysBeforeStart,
    };
}
