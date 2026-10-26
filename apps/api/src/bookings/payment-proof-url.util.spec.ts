import { resolvePaymentProofDownloadUrl } from './payment-proof-url.util';

describe('resolvePaymentProofDownloadUrl', () => {
    const expected = (bookingId: string, base: string) =>
        `${base}/bookings/${bookingId}/payment-proof/download`;

    it('adds /api/v1 when API_URL is a bare origin (staging shape)', () => {
        expect(
            resolvePaymentProofDownloadUrl('booking-1', 'https://ouiboo-api-staging.vercel.app'),
        ).toBe(expected('booking-1', 'https://ouiboo-api-staging.vercel.app/api/v1'));
    });

    it('does not duplicate /api/v1 when API_URL already includes it', () => {
        expect(
            resolvePaymentProofDownloadUrl('booking-1', 'https://api.example.com/api/v1'),
        ).toBe(expected('booking-1', 'https://api.example.com/api/v1'));
    });

    it('strips trailing slashes so no double slash is produced', () => {
        expect(
            resolvePaymentProofDownloadUrl('booking-1', 'https://api.example.com/'),
        ).toBe(expected('booking-1', 'https://api.example.com/api/v1'));
        expect(
            resolvePaymentProofDownloadUrl('booking-1', 'https://api.example.com/api/v1/'),
        ).toBe(expected('booking-1', 'https://api.example.com/api/v1'));
    });

    it('falls back to the local default when API_URL is unset or blank', () => {
        expect(resolvePaymentProofDownloadUrl('booking-1', undefined)).toBe(
            expected('booking-1', 'http://localhost:3000/api/v1'),
        );
        expect(resolvePaymentProofDownloadUrl('booking-1', '')).toBe(
            expected('booking-1', 'http://localhost:3000/api/v1'),
        );
        expect(resolvePaymentProofDownloadUrl('booking-1', null)).toBe(
            expected('booking-1', 'http://localhost:3000/api/v1'),
        );
    });
});
