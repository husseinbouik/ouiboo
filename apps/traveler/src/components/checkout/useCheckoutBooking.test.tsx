import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCheckoutBooking } from './useCheckoutBooking';
import mockEnTranslations from '../../../public/locales/en/translation.json';
import { apiClient } from '@/lib/api-client';
import { CURRENT_BOOKING_TERMS_VERSION } from '@ouiboo/types';

const pushMock = jest.fn();

jest.mock('react-i18next', () => {
    // #424: resolve keys against the real English locale file so the
    // assertions below read the shipped copy, not raw key names.
    const lookup = (key: string): unknown =>
        key.split('.').reduce<any>((acc, part) => acc?.[part], mockEnTranslations);
    return {
        useTranslation: () => ({
            t: (key: string, options?: Record<string, unknown>) => {
                let value = lookup(key);
                if (typeof value !== 'string') return key;
                if (options) {
                    for (const [name, replacement] of Object.entries(options)) {
                        value = (value as string).replaceAll(`{{${name}}}`, String(replacement));
                    }
                }
                return value;
            },
            i18n: { language: 'en' },
        }),
    };
});

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/lib/api-client', () => ({
    apiClient: { post: jest.fn() },
}));

const postMock = apiClient.post as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const baseOptions = {
    tripId: 'trip-1',
    retryBookingId: null,
    selectedSessionId: 'session-1',
    guestCount: 2,
    fullName: 'Launch Traveler',
    phoneNumber: '+212600000000',
    hasBankDetails: true,
    proofFile: null,
    termsAccepted: true,
};

// CIN removal (founder decision 2026-10-25): booking creation needs name +
// phone only, and the payload sent to the API must not carry any
// identity-document number.
describe('useCheckoutBooking (CIN removal)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('creates a booking with name + phone only and sends no document number', async () => {
        postMock.mockResolvedValue({ data: { id: 'booking-1' } });

        const { result } = renderHook(() => useCheckoutBooking(baseOptions), { wrapper });
        await act(async () => {
            result.current.createBookingMutation.mutate();
        });

        await waitFor(() => expect(result.current.createBookingMutation.isSuccess).toBe(true));
        expect(postMock).toHaveBeenCalledTimes(1);
        const payload = postMock.mock.calls[0][1];
        expect(payload).toEqual({
            sessionId: 'session-1',
            guestsCount: 2,
            fullName: 'Launch Traveler',
            phoneNumber: '+212600000000',
            paymentMethod: 'BANK_TRANSFER',
            // #424: the active checkout locale travels with the booking so
            // booking-journey emails render in the traveller's language.
            locale: 'en',
            // #481 + B9: the explicit acceptance flag plus the version
            // of the booking terms this checkout displays — the API
            // requires both and persists them with a server acceptance
            // timestamp.
            termsAccepted: true,
            termsVersion: CURRENT_BOOKING_TERMS_VERSION,
        });
        expect(payload).not.toHaveProperty('documentNumber');
        // #494 (B16): the create call carries one idempotency key for
        // this booking attempt, so a retry or double submit replays
        // instead of double-booking.
        const config = postMock.mock.calls[0][2];
        expect(config.headers['Idempotency-Key']).toEqual(expect.any(String));
        expect(config.headers['Idempotency-Key'].length).toBeGreaterThan(0);
        expect(pushMock).toHaveBeenCalledWith('/checkout/confirmation?bookingId=booking-1&proof=0');
    });

    it('rejects when the terms were not accepted, without calling the API (B9)', async () => {
        const { result } = renderHook(
            () => useCheckoutBooking({ ...baseOptions, termsAccepted: false }),
            { wrapper },
        );
        await act(async () => {
            result.current.createBookingMutation.mutate();
        });

        await waitFor(() => expect(result.current.createBookingMutation.isError).toBe(true));
        expect(postMock).not.toHaveBeenCalled();
        expect(result.current.errorMessage).toBe(
            'You must accept the booking terms to complete your booking',
        );
    });

    it('rejects when guest contact details are missing, without calling the API', async () => {
        const { result } = renderHook(
            () => useCheckoutBooking({ ...baseOptions, fullName: '  ', phoneNumber: '' }),
            { wrapper },
        );
        await act(async () => {
            result.current.createBookingMutation.mutate();
        });

        await waitFor(() => expect(result.current.createBookingMutation.isError).toBe(true));
        expect(postMock).not.toHaveBeenCalled();
        expect(result.current.errorMessage).toBe('Guest contact details are required');
    });

    it('rejects without a selected session, with the localized error', async () => {
        const { result } = renderHook(
            () => useCheckoutBooking({ ...baseOptions, selectedSessionId: null }),
            { wrapper },
        );
        await act(async () => {
            result.current.createBookingMutation.mutate();
        });

        await waitFor(() => expect(result.current.createBookingMutation.isError).toBe(true));
        expect(postMock).not.toHaveBeenCalled();
        expect(result.current.errorMessage).toBe('Session is required');
    });

    it('rejects when the agency has no bank details, with the localized error', async () => {
        const { result } = renderHook(
            () => useCheckoutBooking({ ...baseOptions, hasBankDetails: false }),
            { wrapper },
        );
        await act(async () => {
            result.current.createBookingMutation.mutate();
        });

        await waitFor(() => expect(result.current.createBookingMutation.isError).toBe(true));
        expect(postMock).not.toHaveBeenCalled();
        expect(result.current.errorMessage).toBe(
            'This agency has not configured verified bank transfer instructions yet',
        );
    });
});
