import {
    generateCustomTripPublicRef,
    isCustomTripExpired,
    isCustomTripRequestsEnabled,
    toAgencyCustomTripView,
} from './custom-trips.util';

describe('custom-trip gate (#684)', () => {
    it('defaults OFF and only the exact string true opens it', () => {
        expect(isCustomTripRequestsEnabled({})).toBe(false);
        expect(isCustomTripRequestsEnabled({ CUSTOM_TRIP_REQUESTS_ENABLED: 'false' })).toBe(false);
        expect(isCustomTripRequestsEnabled({ CUSTOM_TRIP_REQUESTS_ENABLED: '1' })).toBe(false);
        expect(isCustomTripRequestsEnabled({ CUSTOM_TRIP_REQUESTS_ENABLED: 'true' })).toBe(true);
    });

    it('generates pseudonymised references', () => {
        const ref = generateCustomTripPublicRef();
        expect(ref).toMatch(/^CTR-[A-Z2-9]{6}$/);
        expect(generateCustomTripPublicRef()).not.toBe(ref);
    });
});

describe('pseudonymisation (#684 Collision-1 form)', () => {
    const row = {
        id: 'req1',
        publicRef: 'CTR-ABC123',
        travelerId: 'trav-secret-id',
        title: 'Chefchaouen weekend',
        description: 'Blue medina',
        category: 'CULTURAL',
        destinationSlug: 'chefchaouen',
        startLocation: 'Chefchaouen',
        requestedStartDate: new Date('2027-01-14'),
        requestedEndDate: new Date('2027-01-16'),
        guestsCount: 3,
        budgetMaxMad: '3000.00',
        note: null,
        status: 'QUOTED',
        expiresAt: new Date('2027-01-10'),
        acceptedOfferId: null,
        createdAt: new Date('2026-12-27'),
        updatedAt: new Date('2026-12-27'),
        traveler: { email: 'traveller@example.test', name: 'Secret Name' },
        offers: [],
        convertedTemplate: null,
    };

    it('an ordinary agency view carries NO traveller identity at all', () => {
        const view = toAgencyCustomTripView(row as never, { revealIdentity: false });
        expect(view.traveler).toBeNull();
        expect(JSON.stringify(view)).not.toContain('trav-secret-id');
        expect(JSON.stringify(view)).not.toContain('traveller@example.test');
        expect(JSON.stringify(view)).not.toContain('Secret Name');
        expect(view.publicRef).toBe('CTR-ABC123');
    });

    it('identity appears only when revealIdentity is set (accepted agency, post-acceptance)', () => {
        const view = toAgencyCustomTripView(row as never, { revealIdentity: true });
        expect(view.traveler).toEqual({ email: 'traveller@example.test', name: 'Secret Name' });
    });
});

describe('expiry (#684)', () => {
    it('only open states expire', () => {
        const past = new Date(Date.now() - 1000);
        expect(isCustomTripExpired({ status: 'PENDING', expiresAt: past })).toBe(true);
        expect(isCustomTripExpired({ status: 'QUOTED', expiresAt: past })).toBe(true);
        expect(isCustomTripExpired({ status: 'CONVERTED', expiresAt: past })).toBe(false);
        expect(isCustomTripExpired({ status: 'PENDING', expiresAt: new Date(Date.now() + 100000) })).toBe(false);
    });
});
