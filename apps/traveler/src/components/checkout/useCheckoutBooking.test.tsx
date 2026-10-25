import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCheckoutBooking } from './useCheckoutBooking';
import mockEnTranslations from '../../../public/locales/en/translation.json';
import { apiClient } from '@/lib/api-client';

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
        });
        expect(payload).not.toHaveProperty('documentNumber');
        expect(pushMock).toHaveBeenCalledWith('/checkout/confirmation?bookingId=booking-1&proof=0');
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
});
