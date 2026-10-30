import {
    PAY_ON_ARRIVAL_MAX_TOTAL_MAD,
    normalizeItineraryStops,
    normalizePickupPoints,
    payOnArrivalBookingError,
    payOnArrivalTripError,
    resolvePayLaterDeadline,
} from './batch-f.util';

describe('pay-on-arrival rules (#697)', () => {
    it('trip election requires a single-day activity', () => {
        expect(payOnArrivalTripError({ durationDays: 2, payOnArrivalEnabled: true })).toMatch(/single-day/);
        expect(payOnArrivalTripError({ durationDays: 1, payOnArrivalEnabled: true })).toBeNull();
        expect(payOnArrivalTripError({ durationDays: 5, payOnArrivalEnabled: false })).toBeNull();
    });

    it('booking must be elected, single-day, non-min-group and under the ceiling', () => {
        const base = { payOnArrivalEnabled: true, durationDays: 1, sessionMinBookings: 1, totalAmount: 300 };
        expect(payOnArrivalBookingError(base)).toBeNull();
        expect(payOnArrivalBookingError({ ...base, totalAmount: PAY_ON_ARRIVAL_MAX_TOTAL_MAD + 1 })).toMatch(/at most/);
        expect(payOnArrivalBookingError({ ...base, totalAmount: PAY_ON_ARRIVAL_MAX_TOTAL_MAD })).toBeNull();
        expect(payOnArrivalBookingError({ ...base, sessionMinBookings: 4 })).toMatch(/minimum-group/);
        expect(payOnArrivalBookingError({ ...base, payOnArrivalEnabled: false })).toBeNull();
    });
});

describe('pay-later deadline (#696)', () => {
    const start = new Date('2027-02-01T09:00:00Z');
    const now = new Date('2027-01-01T09:00:00Z');

    it('no deadline when not requested or not allowed — no card, no charge, just no hold', () => {
        expect(resolvePayLaterDeadline({ requested: false, allowPayLater: true, sessionStart: start, now })).toBeNull();
        expect(resolvePayLaterDeadline({ requested: true, allowPayLater: false, sessionStart: start, now })).toBeNull();
    });

    it('defaults to a 48h hold', () => {
        const deadline = resolvePayLaterDeadline({ requested: true, allowPayLater: true, sessionStart: start, now });
        expect(deadline?.toISOString()).toBe('2027-01-03T09:00:00.000Z');
    });

    it('never reaches the session start', () => {
        const soon = new Date('2027-01-01T10:00:00Z');
        const deadline = resolvePayLaterDeadline({ requested: true, allowPayLater: true, payLaterHoldHours: 48, sessionStart: soon, now });
        expect(deadline!.getTime()).toBeLessThan(soon.getTime());
    });
});

describe('pickup points + stops (#701)', () => {
    it('normalizes pickup points with generated ids', () => {
        const points = normalizePickupPoints([{ name: 'Gare Tanger Ville' }]);
        expect(points).toEqual([{ id: 'pickup-1', name: 'Gare Tanger Ville', address: null, mapsUrl: null }]);
    });

    it('rejects non-http maps urls and duplicate ids', () => {
        expect(() => normalizePickupPoints([{ name: 'X', mapsUrl: 'ftp://x' }])).toThrow(/http/);
        expect(() => normalizePickupPoints([{ id: 'a', name: 'X' }, { id: 'a', name: 'Y' }])).toThrow(/unique/);
    });

    it('normalizes stops with language-keyed names', () => {
        const stops = normalizeItineraryStops([{ name: { fr: 'Médina' }, durationMinutes: 45 }]);
        expect(stops?.[0].name.fr).toBe('Médina');
        expect(stops?.[0].durationMinutes).toBe(45);
        expect(() => normalizeItineraryStops([{ name: {} }])).toThrow(/name/);
    });
});
