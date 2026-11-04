import { toMoneyDecimal, toMoneyString, type MoneyInput } from '../common/money.util';

/**
 * #780 (Council S6 Phase 3): CSV building for the agency self-serve data
 * export. Pure helpers so the tenant-isolation + escaping behaviour is
 * unit-testable without a database. Every value passes through
 * escapeCsvValue (RFC 4180 quoting) and spreadsheet formula-injection
 * neutralisation for text cells that begin with =, +, -, @, tab or CR.
 */
export const escapeCsvValue = (value: unknown): string => {
    if (value === null || value === undefined) {
        return '';
    }
    let stringValue = String(value);
    if (/^[=+\-@\t\r]/.test(stringValue)) {
        stringValue = `'${stringValue}`;
    }
    if (
        stringValue.includes('"') ||
        stringValue.includes(',') ||
        stringValue.includes('\n') ||
        stringValue.includes('\r')
    ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};

export const buildCsv = (headers: string[], rows: unknown[][]): string =>
    [headers.join(','), ...rows.map((row) => row.map(escapeCsvValue).join(','))].join('\n') + '\n';

const iso = (value: Date | string | null | undefined): string => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

const money = (value: MoneyInput | null | undefined): string =>
    value === null || value === undefined ? '' : toMoneyString(value) ?? '';

export type BookingExportRow = {
    id: string;
    status: string;
    paymentStatus: string;
    guestsCount: number;
    totalAmount: MoneyInput;
    currency?: string | null;
    fullName?: string | null;
    phoneNumber?: string | null;
    createdAt?: Date | string | null;
    bookingDate?: Date | string | null;
    traveler?: { name?: string | null; email?: string | null } | null;
    session?: {
        startDate: Date | string;
        deposit?: MoneyInput | null;
        template?: { title?: string | null } | null;
    } | null;
    paymentPlan?: {
        depositAmount: MoneyInput;
        balanceAmount: MoneyInput;
    } | null;
};

export const BOOKING_EXPORT_HEADERS = [
    'bookingId',
    'tripTitle',
    'sessionDate',
    'travelerName',
    'travelerEmail',
    'travelerPhone',
    'guests',
    'status',
    'paymentStatus',
    'totalAmountMAD',
    'depositAmountMAD',
    'balanceAmountMAD',
    'createdAt',
];

export const bookingsToCsv = (bookings: BookingExportRow[]): string => {
    const rows = bookings.map((booking) => {
        let deposit = '';
        let balance = '';
        if (booking.paymentPlan) {
            deposit = money(booking.paymentPlan.depositAmount);
            balance = money(booking.paymentPlan.balanceAmount);
        } else if (booking.session?.deposit != null) {
            // Session deposit is per seat (#369); a booking without a
            // staged plan still reconciles deposit x guests, with the
            // remainder of the total as the balance.
            const depositDecimal = toMoneyDecimal(booking.session.deposit).mul(booking.guestsCount);
            deposit = depositDecimal.toFixed(2);
            balance = toMoneyDecimal(booking.totalAmount).minus(depositDecimal).toFixed(2);
        }
        return [
            booking.id,
            booking.session?.template?.title ?? '',
            iso(booking.session?.startDate),
            booking.fullName || booking.traveler?.name || '',
            booking.traveler?.email || '',
            booking.phoneNumber || '',
            booking.guestsCount,
            booking.status,
            booking.paymentStatus,
            money(booking.totalAmount),
            deposit,
            balance,
            iso(booking.createdAt ?? booking.bookingDate),
        ];
    });
    return buildCsv(BOOKING_EXPORT_HEADERS, rows);
};

export type TripExportRow = {
    id: string;
    title: string;
    status: string;
    startingPrice?: MoneyInput | null;
    durationDays: number;
    durationNights: number;
    createdAt?: Date | string | null;
    sessions?: Array<{ price?: MoneyInput | null }> | null;
    _count?: { sessions?: number } | null;
};

export const TRIP_EXPORT_HEADERS = [
    'tripId',
    'title',
    'status',
    'priceMAD',
    'durationDays',
    'durationNights',
    'sessionsCount',
    'createdAt',
];

export const tripsToCsv = (trips: TripExportRow[]): string => {
    const rows = trips.map((trip) => [
        trip.id,
        trip.title,
        trip.status,
        money(trip.startingPrice ?? trip.sessions?.[0]?.price),
        trip.durationDays,
        trip.durationNights,
        trip._count?.sessions ?? trip.sessions?.length ?? 0,
        iso(trip.createdAt),
    ]);
    return buildCsv(TRIP_EXPORT_HEADERS, rows);
};

export type ReviewExportRow = {
    id: string;
    rating: number;
    comment?: string | null;
    status: string;
    createdAt?: Date | string | null;
    traveler?: { name?: string | null } | null;
    tripTemplate?: { title?: string | null } | null;
};

export const REVIEW_EXPORT_HEADERS = [
    'reviewId',
    'tripTitle',
    'rating',
    'comment',
    'travelerName',
    'date',
    'moderationStatus',
];

export const reviewsToCsv = (reviews: ReviewExportRow[]): string => {
    const rows = reviews.map((review) => [
        review.id,
        review.tripTemplate?.title ?? '',
        review.rating,
        review.comment ?? '',
        review.traveler?.name ?? '',
        iso(review.createdAt),
        review.status,
    ]);
    return buildCsv(REVIEW_EXPORT_HEADERS, rows);
};
