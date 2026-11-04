import { Prisma } from '@ouiboo/database';
import { toMoneyString } from '../common/money.util';

/**
 * #786 (Council S6 Phase 3, smallest useful slice): agency CRM
 * aggregation helpers.
 *
 * Everything here is derived from bookings the agency already owns —
 * no new personal data is collected. Contact channels are exactly the
 * ones already visible to the agency through its bookings (traveller
 * account name/email + the booking's contact name/phone).
 *
 * Booked value is display-only: it sums booking totals and never
 * implies Ouiboo holds or moves the money (travellers pay the agency
 * directly). Cancelled / rejected bookings are excluded from value
 * sums because no trip is delivered for them.
 */

export const CRM_PIPELINE_STATUSES = [
    'PENDING',
    'AWAITING_VALIDATION',
    'PENDING_MINIMUM',
    'CONFIRMED',
    'COMPLETED',
    'NOT_CONFIRMED',
    'CANCELLED',
    'REJECTED',
    'NO_SHOW',
] as const;

export type CrmPipelineStatus = (typeof CRM_PIPELINE_STATUSES)[number];

export const CRM_VALUE_EXCLUDED_STATUSES: ReadonlySet<string> = new Set([
    'CANCELLED',
    'REJECTED',
]);

export interface CrmBookingRow {
    travelerId: string;
    status: string;
    totalAmount: Prisma.Decimal | string | number;
    bookingDate: Date;
    fullName?: string | null;
    phoneNumber?: string | null;
    traveler?: { name?: string | null; email?: string | null } | null;
    session?: { templateId?: string | null } | null;
}

export interface CrmContact {
    travelerId: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    bookingCount: number;
    tripCount: number;
    lastBookingDate: string;
    totalBookedValue: string;
    currency: 'MAD';
}

/**
 * Collapse an agency's bookings (any order) into one contact per
 * traveller. Name/phone come from the traveller's MOST RECENT booking
 * that carries them (booking contact details are what the agency
 * actually worked with); email is the traveller account email.
 */
export function aggregateCrmContacts(bookings: CrmBookingRow[]): CrmContact[] {
    const byTraveler = new Map<
        string,
        {
            contact: CrmContact;
            value: Prisma.Decimal;
            templates: Set<string>;
            latestAt: number;
            nameAt: number;
            phoneAt: number;
        }
    >();

    for (const booking of bookings) {
        const at = booking.bookingDate.getTime();
        let entry = byTraveler.get(booking.travelerId);
        if (!entry) {
            entry = {
                contact: {
                    travelerId: booking.travelerId,
                    name: null,
                    email: booking.traveler?.email ?? null,
                    phone: null,
                    bookingCount: 0,
                    tripCount: 0,
                    lastBookingDate: booking.bookingDate.toISOString(),
                    totalBookedValue: '0.00',
                    currency: 'MAD',
                },
                value: new Prisma.Decimal(0),
                templates: new Set<string>(),
                latestAt: at,
                nameAt: -1,
                phoneAt: -1,
            };
            byTraveler.set(booking.travelerId, entry);
        }

        entry.contact.bookingCount += 1;
        if (booking.session?.templateId) {
            entry.templates.add(booking.session.templateId);
        }
        if (!CRM_VALUE_EXCLUDED_STATUSES.has(booking.status)) {
            entry.value = entry.value.add(new Prisma.Decimal(booking.totalAmount as any));
        }
        if (at >= entry.latestAt) {
            entry.latestAt = at;
            entry.contact.lastBookingDate = booking.bookingDate.toISOString();
        }
        const name = booking.fullName ?? booking.traveler?.name ?? null;
        if (name && at >= entry.nameAt) {
            entry.nameAt = at;
            entry.contact.name = name;
        }
        if (booking.phoneNumber && at >= entry.phoneAt) {
            entry.phoneAt = at;
            entry.contact.phone = booking.phoneNumber;
        }
        if (!entry.contact.email && booking.traveler?.email) {
            entry.contact.email = booking.traveler.email;
        }
    }

    return [...byTraveler.values()]
        .map((entry) => ({
            ...entry.contact,
            tripCount: entry.templates.size,
            totalBookedValue: toMoneyString(entry.value) ?? '0.00',
        }))
        .sort((a, b) => b.lastBookingDate.localeCompare(a.lastBookingDate));
}

export interface CrmPipelineStageInput {
    status: string;
    count: number;
    totalAmount: Prisma.Decimal | string | number | null;
}

export interface CrmPipelineStage {
    status: CrmPipelineStatus;
    count: number;
    totalAmount: string;
    currency: 'MAD';
}

/**
 * Build the pipeline board: EVERY booking status appears exactly once
 * (zero-filled), in a stable workflow order, so the board never
 * reshapes itself as bookings move between stages.
 */
export function aggregateCrmPipeline(
    grouped: CrmPipelineStageInput[],
    refundCases: { open: number; total: number },
) {
    const byStatus = new Map(grouped.map((row) => [row.status, row]));
    const stages: CrmPipelineStage[] = CRM_PIPELINE_STATUSES.map((status) => {
        const row = byStatus.get(status);
        return {
            status,
            count: row?.count ?? 0,
            totalAmount:
                row?.totalAmount == null
                    ? '0.00'
                    : (toMoneyString(row.totalAmount as any) ?? '0.00'),
            currency: 'MAD' as const,
        };
    });

    const totalBookings = stages.reduce((sum, stage) => sum + stage.count, 0);
    const bookedValue = stages
        .filter((stage) => !CRM_VALUE_EXCLUDED_STATUSES.has(stage.status))
        .reduce(
            (sum, stage) => sum.add(new Prisma.Decimal(stage.totalAmount)),
            new Prisma.Decimal(0),
        );

    return {
        stages,
        totals: {
            bookings: totalBookings,
            bookedValue: toMoneyString(bookedValue) ?? '0.00',
            currency: 'MAD' as const,
        },
        refundCases: { open: refundCases.open, total: refundCases.total },
    };
}
