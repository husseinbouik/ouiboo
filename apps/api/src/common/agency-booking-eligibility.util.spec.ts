import {
    canAgencyAcceptBookings,
    isAgencySubscriptionValid,
    publicBookableAgencyWhere,
    type AgencyBookingEligibilityProfile,
} from './agency-booking-eligibility.util';

/**
 * #728: the booking-eligibility states the issue's acceptance criteria
 * name — verified/subscribed, unverified, expired-trial, disabled —
 * plus every other leg of the booking gate, so public discovery and
 * booking creation can never drift apart again.
 */
describe('agency booking eligibility (#728)', () => {
    const now = new Date('2026-10-31T00:00:00.000Z');
    const future = new Date('2027-01-01T00:00:00.000Z');
    const past = new Date('2026-01-01T00:00:00.000Z');

    const eligible: AgencyBookingEligibilityProfile = {
        verificationStatus: 'VERIFIED',
        subscriptionStatus: 'ACTIVE',
        trialEndsAt: null,
        subscriptionEndsAt: null,
        newBookingsRestrictedAt: null,
        travelLicenceStatus: 'VERIFIED',
        licenceExpiry: future,
        insuranceStatus: 'VERIFIED',
        insuranceExpiry: future,
    };

    it('accepts a verified agency with an open-ended ACTIVE subscription', () => {
        expect(canAgencyAcceptBookings(eligible, now)).toBe(true);
    });

    it('accepts an ACTIVE subscription ending in the future and an unexpired TRIAL', () => {
        expect(
            canAgencyAcceptBookings({ ...eligible, subscriptionEndsAt: future }, now),
        ).toBe(true);
        expect(
            canAgencyAcceptBookings(
                { ...eligible, subscriptionStatus: 'TRIAL', trialEndsAt: future },
                now,
            ),
        ).toBe(true);
        expect(isAgencySubscriptionValid({ subscriptionStatus: 'TRIAL', trialEndsAt: future }, now)).toBe(true);
    });

    it('rejects an unverified agency (PENDING / REJECTED identity)', () => {
        expect(canAgencyAcceptBookings({ ...eligible, verificationStatus: 'PENDING' }, now)).toBe(false);
        expect(canAgencyAcceptBookings({ ...eligible, verificationStatus: 'REJECTED' }, now)).toBe(false);
    });

    it('rejects an expired trial — and a TRIAL with no trial end on record (the staging-seed shape)', () => {
        expect(
            canAgencyAcceptBookings(
                { ...eligible, subscriptionStatus: 'TRIAL', trialEndsAt: past },
                now,
            ),
        ).toBe(false);
        expect(
            canAgencyAcceptBookings(
                { ...eligible, subscriptionStatus: 'TRIAL', trialEndsAt: null },
                now,
            ),
        ).toBe(false);
    });

    it('rejects disabled subscription states (CANCELLED / EXPIRED) and an elapsed ACTIVE end date', () => {
        expect(canAgencyAcceptBookings({ ...eligible, subscriptionStatus: 'CANCELLED' }, now)).toBe(false);
        expect(canAgencyAcceptBookings({ ...eligible, subscriptionStatus: 'EXPIRED' }, now)).toBe(false);
        expect(canAgencyAcceptBookings({ ...eligible, subscriptionEndsAt: past }, now)).toBe(false);
    });

    it('rejects an agency restricted from new bookings by the refund ladder', () => {
        expect(
            canAgencyAcceptBookings({ ...eligible, newBookingsRestrictedAt: past }, now),
        ).toBe(false);
    });

    it('rejects an agency whose licence or insurance is not effectively verified', () => {
        expect(canAgencyAcceptBookings({ ...eligible, travelLicenceStatus: 'PENDING_REVIEW' }, now)).toBe(false);
        expect(canAgencyAcceptBookings({ ...eligible, licenceExpiry: past }, now)).toBe(false);
        expect(canAgencyAcceptBookings({ ...eligible, licenceExpiry: null }, now)).toBe(false);
        expect(canAgencyAcceptBookings({ ...eligible, insuranceStatus: 'NOT_SUBMITTED' }, now)).toBe(false);
        expect(canAgencyAcceptBookings({ ...eligible, insuranceExpiry: past }, now)).toBe(false);
    });

    it('builds a Prisma fragment carrying every leg of the same predicate', () => {
        const where = publicBookableAgencyWhere(now) as any;
        expect(where.verificationStatus).toBe('VERIFIED');
        expect(where.newBookingsRestrictedAt).toBeNull();
        expect(where.travelLicenceStatus).toBe('VERIFIED');
        expect(where.licenceExpiry).toEqual({ gt: now });
        expect(where.insuranceStatus).toBe('VERIFIED');
        expect(where.insuranceExpiry).toEqual({ gt: now });
        expect(where.OR).toEqual([
            {
                subscriptionStatus: 'ACTIVE',
                OR: [{ subscriptionEndsAt: null }, { subscriptionEndsAt: { gt: now } }],
            },
            { subscriptionStatus: 'TRIAL', trialEndsAt: { gt: now } },
        ]);
    });
});
