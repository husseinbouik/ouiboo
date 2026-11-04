/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookingPassCard } from './BookingPassCard';

const mockGet = jest.fn();
jest.mock('@/lib/api-client', () => ({
    apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

jest.mock('qrcode', () => ({
    toDataURL: jest.fn(async () => 'data:image/png;base64,qr'),
}));

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, opts?: Record<string, unknown>) => {
            if (key === 'bookingPass.paidToAgency') return `paid to ${opts?.seller}`;
            if (key === 'bookingPass.whatsappGreeting') return `hello ${opts?.seller}`;
            return key;
        },
        i18n: { language: 'en' },
    }),
}));

const booking: any = {
    id: 'booking-1',
    status: 'CONFIRMED',
    currency: 'MAD',
    totalAmount: '2000.00',
    paymentPlan: null,
    session: {
        startDate: '2026-12-01T00:00:00.000Z',
        endDate: '2026-12-02T00:00:00.000Z',
        template: {
            title: 'Chefchaouen Day Trip',
            agency: { id: 'agency-1', companyName: 'Atlas Test', legalName: 'Atlas Test SARL', businessPhone: '+212600000000' },
        },
    },
};

const pass: any = {
    bookingId: 'booking-1',
    status: 'CONFIRMED',
    issuedAt: '2026-11-01T00:00:00.000Z',
    token: 'header.payload.signature',
    seller: { agencyId: 'agency-1', legalName: 'Atlas Test SARL', companyName: 'Atlas Test' },
    tripTitle: 'Chefchaouen Day Trip',
    startDate: '2026-12-01T00:00:00.000Z',
    endDate: '2026-12-02T00:00:00.000Z',
    guestsCount: 2,
    currency: 'MAD',
    totalAmount: '2000.00',
    depositConfirmedAmount: '600.00',
    balanceAmount: '1400.00',
    meetingPoint: { address: 'Place Mohammed V, Chefchaouen', mapsUrl: 'https://maps.example/x', pickupAvailable: false },
    attendance: null,
    passCheckInAt: null,
};

function renderCard() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <BookingPassCard booking={booking} />
        </QueryClientProvider>,
    );
}

describe('BookingPassCard (#689)', () => {
    beforeEach(() => {
        mockGet.mockReset();
        window.localStorage.clear();
    });

    it('renders the pass as the receipt: agency named as payee, no-funds-held statement, meeting point unlocked, QR shown', async () => {
        mockGet.mockResolvedValue({ data: pass });
        renderCard();
        await waitFor(() => expect(screen.getByTestId('booking-pass')).toBeTruthy());
        expect(screen.getByText('paid to Atlas Test SARL')).toBeTruthy();
        expect(screen.getByText('bookingPass.noFundsHeld')).toBeTruthy();
        expect(screen.getByTestId('booking-pass-meeting-point')).toBeTruthy();
        expect(screen.getByText(/Place Mohammed V/)).toBeTruthy();
        const img = await screen.findByAltText('bookingPass.qrAlt');
        expect(img.getAttribute('src')).toContain('data:image/png');
        // The pass artefact is persisted on-device for the offline render (#690).
        await waitFor(() =>
            expect(window.localStorage.getItem('ouiboo-booking-pass:booking-1')).toContain('header.payload.signature'),
        );
    });

    it('before agency confirmation there is no pass — only the honest pending note', async () => {
        mockGet.mockRejectedValue(new Error('400'));
        renderCard();
        await waitFor(() => expect(screen.getByTestId('booking-pass-pending')).toBeTruthy());
        expect(screen.queryByTestId('booking-pass')).toBeNull();
    });

    it('renders the on-device copy offline when the live fetch fails (#690)', async () => {
        window.localStorage.setItem('ouiboo-booking-pass:booking-1', JSON.stringify(pass));
        mockGet.mockRejectedValue(new Error('offline'));
        renderCard();
        await waitFor(() => expect(screen.getByTestId('booking-pass')).toBeTruthy());
        expect(screen.getByText('bookingPass.offlineCopy')).toBeTruthy();
    });
});
