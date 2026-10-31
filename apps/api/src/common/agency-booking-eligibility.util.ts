import { isInsuranceVerified, isLicenceVerified } from './agency-licence.util';

/**
 * #728: ONE definition of "this agency can accept a new booking right
 * now", shared by the booking gate (BookingsService.create) and by
 * public discovery (TripsService). Before #728 the two disagreed:
 * discovery only required a VERIFIED identity, while booking creation
 * also required a currently-valid subscription, no new-bookings
 * restriction, and effectively-verified licence + RC insurance — so a
 * lapsed agency kept advertising ACTIVE trips whose booking flow
 * dead-ended with "This agency is not currently accepting bookings".
 *
 * The legs (identical to the pre-#728 booking gate, in its order):
 *  1. identity `verificationStatus === 'VERIFIED'`
 *  2. subscription currently valid — ACTIVE with no end date or an end
 *     date in the future, or TRIAL with a trial end in the future
 *     (a TRIAL with no trial end on record is NOT valid: the staging
 *     seed shipped exactly that shape and it could never book)
 *  3. no refund-ladder restriction (`newBookingsRestrictedAt` unset)
 *  4. travel licence effectively verified (stored VERIFIED + unexpired)
 *  5. RC insurance effectively verified (stored VERIFIED + unexpired)
 *
 * Existing bookings are never affected by this predicate — it only
 * gates NEW bookings and public advertisement of bookable trips.
 */
export type AgencyBookingEligibilityProfile = {
    verificationStatus?: string | null;
    subscriptionStatus?: string | null;
    trialEndsAt?: Date | string | null;
    subscriptionEndsAt?: Date | string | null;
    newBookingsRestrictedAt?: Date | string | null;
    travelLicenceStatus?: string | null;
    licenceExpiry?: Date | string | null;
    insuranceStatus?: string | null;
    insuranceExpiry?: Date | string | null;
};

function isFutureDate(value: Date | string | null | undefined, now: Date): boolean {
    if (!value) {
        return false;
    }
    const parsed = value instanceof Date ? value : new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.getTime() > now.getTime();
}

export function isAgencySubscriptionValid(
    profile: Pick<AgencyBookingEligibilityProfile, 'subscriptionStatus' | 'trialEndsAt' | 'subscriptionEndsAt'>,
    now: Date = new Date(),
): boolean {
    if (profile.subscriptionStatus === 'ACTIVE') {
        return !profile.subscriptionEndsAt || isFutureDate(profile.subscriptionEndsAt, now);
    }
    if (profile.subscriptionStatus === 'TRIAL') {
        return isFutureDate(profile.trialEndsAt, now);
    }
    return false;
}

export function canAgencyAcceptBookings(
    profile: AgencyBookingEligibilityProfile,
    now: Date = new Date(),
): boolean {
    if (profile.verificationStatus !== 'VERIFIED') {
        return false;
    }
    if (!isAgencySubscriptionValid(profile, now)) {
        return false;
    }
    if (profile.newBookingsRestrictedAt) {
        return false;
    }
    if (!isLicenceVerified(profile, now) || !isInsuranceVerified(profile, now)) {
        return false;
    }
    return true;
}

/**
 * The Prisma `where` fragment for the AgencyProfile relation that is
 * exactly equivalent to {@link canAgencyAcceptBookings}: stored
 * VERIFIED licence/insurance with a future expiry is the stored-shape
 * of "effectively verified" (a VERIFIED artefact with no expiry reads
 * as PENDING_REVIEW in the JS derivation, and a `gt` filter on a
 * nullable column excludes nulls). Used by every public discovery
 * query so pagination and counts exclude ineligible agencies in the
 * database, never by post-filtering a page.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma relation-filter shape; callers pass it into typed where clauses
export function publicBookableAgencyWhere(now: Date = new Date()): any {
    return {
        verificationStatus: 'VERIFIED',
        newBookingsRestrictedAt: null,
        travelLicenceStatus: 'VERIFIED',
        licenceExpiry: { gt: now },
        insuranceStatus: 'VERIFIED',
        insuranceExpiry: { gt: now },
        OR: [
            {
                subscriptionStatus: 'ACTIVE',
                OR: [{ subscriptionEndsAt: null }, { subscriptionEndsAt: { gt: now } }],
            },
            {
                subscriptionStatus: 'TRIAL',
                trialEndsAt: { gt: now },
            },
        ],
    };
}
