import { BookingStatus, type BookingStatusType } from '@ouiboo/types';

/**
 * #419 (Council P0-16): the support split, as product rules.
 *
 * Support is solo and split in two lanes:
 * - NORMAL support: email, answered within 48 hours.
 * - ACTIVE-TRIP emergency: the agency's emergency contact is FIRST;
 *   OuiBoo is the escalation, during the active trip period only —
 *   never a 24/7 promise.
 *
 * These helpers decide when a booking shows its departure pack (trip
 * contacts) and whether the trip is in its active window, so every
 * surface phrases the lanes the same way.
 */

/** Booking statuses for which a departure pack (trip contacts) makes
 * sense: the trip is still ahead of the traveller or under way. A
 * cancelled / rejected / not-confirmed / completed booking has no
 * departure to pack for. */
export const shouldShowTripContacts = (status: BookingStatusType): boolean =>
    status === BookingStatus.Confirmed ||
    status === BookingStatus.Pending ||
    status === BookingStatus.PendingMinimum ||
    status === BookingStatus.AwaitingValidation;

/**
 * The active-trip window: from the start of the session's first day to
 * the end of its last day (dates compared by calendar day in UTC, the
 * same grain the booking surfaces display). Inside this window an
 * emergency means "contact the agency first, escalate to OuiBoo if
 * they do not respond"; outside it, everything is normal support.
 */
export const isTripActiveWindow = (
    startDate: string | Date,
    endDate: string | Date,
    now: Date = new Date(),
): boolean => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return false;
    }
    const dayStart = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const dayEnd = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999);
    const instant = now.getTime();
    return instant >= dayStart && instant <= dayEnd;
};

/** Normal-lane response commitment, in hours (founder decision). */
export const NORMAL_SUPPORT_RESPONSE_HOURS = 48;

/** Agency refund deadline once a refund case opens, in days (the SLA
 * the human chase cadence works behind — see RefundCase.refundDueAt). */
export const REFUND_SLA_DAYS = 7;
