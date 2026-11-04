/**
 * Council S6 Batch F shared rules (#694, #696, #697, #701).
 *
 * Model filter, enforced here rather than in copy: Ouiboo never holds,
 * sells, escrows or guarantees traveller money. Pay-later holds a SEAT
 * (no card stored, no auto-charge, no dunning); pay-on-arrival moves
 * NO money through any Ouiboo surface; a private session is the same
 * agency-direct staged machine with the min-group branch removed.
 */

/**
 * #697: the low-value ceiling for pay-on-arrival, in MAD — the TOTAL
 * booking amount (per-person price × guests, variants/add-ons
 * included) may not exceed it. Above this, money must move through
 * the ordinary agency-direct proof flow so a paper trail exists.
 */
export const PAY_ON_ARRIVAL_MAX_TOTAL_MAD = 500;

/** #696: default + bounds for a pay-later seat hold, in hours. */
export const PAY_LATER_DEFAULT_HOLD_HOURS = 48;
export const PAY_LATER_MIN_HOLD_HOURS = 1;
export const PAY_LATER_MAX_HOLD_HOURS = 336; // 14 days

/** #701: caps for pickup points and per-stop detail. */
export const MAX_PICKUP_POINTS = 10;
export const MAX_ITINERARY_STOPS_PER_DAY = 12;

/**
 * #697 eligibility of a TRIP for the pay-on-arrival election: a dated,
 * single-day activity only — never multi-day, never a min-group trip
 * shape (min-group is a template/session property checked again at
 * booking time against the session).
 */
export function payOnArrivalTripError(args: {
    durationDays: number;
    payOnArrivalEnabled: boolean;
}): string | null {
    if (!args.payOnArrivalEnabled) return null;
    if (args.durationDays !== 1) {
        return 'Pay-on-arrival is only available for single-day dated activities';
    }
    return null;
}

/** #697 eligibility of one BOOKING under the election. */
export function payOnArrivalBookingError(args: {
    payOnArrivalEnabled: boolean;
    durationDays: number;
    sessionMinBookings: number;
    totalAmount: number;
}): string | null {
    if (!args.payOnArrivalEnabled) return null;
    if (args.durationDays !== 1) {
        return 'Pay-on-arrival is only available for single-day dated activities';
    }
    if (args.sessionMinBookings > 1) {
        return 'Pay-on-arrival is not available for minimum-group trips';
    }
    if (args.totalAmount > PAY_ON_ARRIVAL_MAX_TOTAL_MAD) {
        return `Pay-on-arrival is limited to bookings of at most ${PAY_ON_ARRIVAL_MAX_TOTAL_MAD} MAD`;
    }
    return null;
}

/** #696: resolve a booking's pay-later deadline, or null when the
 * traveller did not elect pay-later / the session does not allow it.
 * The deadline never reaches the session start. */
export function resolvePayLaterDeadline(args: {
    requested: boolean;
    allowPayLater: boolean;
    payLaterHoldHours?: number | null;
    sessionStart: Date;
    now?: Date;
}): Date | null {
    if (!args.requested || !args.allowPayLater) return null;
    const now = args.now ?? new Date();
    const hours = Math.min(
        PAY_LATER_MAX_HOLD_HOURS,
        Math.max(PAY_LATER_MIN_HOLD_HOURS, args.payLaterHoldHours ?? PAY_LATER_DEFAULT_HOLD_HOURS),
    );
    const deadline = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return deadline < args.sessionStart ? deadline : new Date(args.sessionStart.getTime() - 60 * 1000);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanLangMap(raw: unknown, maxLength: number): Record<string, string> | null {
    if (!isRecord(raw)) return null;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        if (trimmed) out[key.toLowerCase().slice(0, 8)] = trimmed.slice(0, maxLength);
    }
    return Object.keys(out).length > 0 ? out : null;
}

export interface PickupPoint {
    id: string;
    name: string;
    address?: string | null;
    mapsUrl?: string | null;
}

/** #701: validate + normalize the agency-defined pickup points. */
export function normalizePickupPoints(raw: unknown): PickupPoint[] | null {
    if (raw === undefined || raw === null) return null;
    if (!Array.isArray(raw)) throw new Error('pickupPoints must be an array');
    if (raw.length > MAX_PICKUP_POINTS) {
        throw new Error(`A trip may define at most ${MAX_PICKUP_POINTS} pickup points`);
    }
    const seen = new Set<string>();
    return raw.map((item, index) => {
        if (!isRecord(item)) throw new Error('Each pickup point needs a name');
        const name = typeof item.name === 'string' ? item.name.trim().slice(0, 200) : '';
        if (!name) throw new Error('Each pickup point needs a name');
        const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim().slice(0, 64) : `pickup-${index + 1}`;
        if (seen.has(id)) throw new Error('Pickup point ids must be unique');
        seen.add(id);
        const mapsUrl = typeof item.mapsUrl === 'string' && item.mapsUrl.trim() ? item.mapsUrl.trim().slice(0, 1000) : null;
        if (mapsUrl && !/^https?:\/\//.test(mapsUrl)) throw new Error('pickup point mapsUrl must be an http(s) URL');
        return {
            id,
            name,
            address: typeof item.address === 'string' && item.address.trim() ? item.address.trim().slice(0, 300) : null,
            mapsUrl,
        };
    });
}

export interface ItineraryStop {
    name: Record<string, string>;
    durationMinutes?: number | null;
    admissionNote?: Record<string, string> | null;
}

/** #701: validate + normalize one day's per-stop detail. */
export function normalizeItineraryStops(raw: unknown): ItineraryStop[] | null {
    if (raw === undefined || raw === null) return null;
    if (!Array.isArray(raw)) throw new Error('stops must be an array');
    if (raw.length > MAX_ITINERARY_STOPS_PER_DAY) {
        throw new Error(`A day may carry at most ${MAX_ITINERARY_STOPS_PER_DAY} stops`);
    }
    return raw.map((item) => {
        if (!isRecord(item)) throw new Error('Each stop needs a name');
        const name = cleanLangMap(item.name, 300);
        if (!name) throw new Error('Each stop needs a name in at least one language');
        const duration = item.durationMinutes;
        if (duration !== undefined && duration !== null && (!Number.isInteger(duration) || (duration as number) < 0 || (duration as number) > 1440)) {
            throw new Error('Stop durationMinutes must be an integer between 0 and 1440');
        }
        return {
            name,
            durationMinutes: typeof duration === 'number' ? duration : null,
            admissionNote: item.admissionNote ? cleanLangMap(item.admissionNote, 500) : null,
        };
    });
}

/** #701: validate + normalize a day's free-text notes (language map). */
export function normalizeDayNotes(raw: unknown): Record<string, string> | null {
    if (raw === undefined || raw === null) return null;
    const notes = cleanLangMap(raw, 2000);
    if (!notes) throw new Error('Day notes must be a language-keyed text map');
    return notes;
}
