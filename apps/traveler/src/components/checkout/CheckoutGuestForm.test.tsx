import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckoutGuestForm } from './CheckoutGuestForm';
import { DisplayCurrencyProvider } from '@/lib/display-currency';
import mockEnTranslations from '../../../public/locales/en/translation.json';

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


// CIN removal (founder decision 2026-10-25): the checkout guest form must
// never ask for an identity-document number; the agency checks ID at
// departure instead.
// #619: the checkout components now read the display-currency hooks, so
// renders need the query + display-currency providers with the API and
// auth layers mocked (same pattern as lib/display-currency.test.tsx).
const mockGet = jest.fn();
let mockUser: any = null;

jest.mock('@/lib/api-client', () => ({
    apiClient: {
        get: (...args: unknown[]) => mockGet(...args),
        patch: jest.fn().mockResolvedValue({ data: {} }),
    },
}));

jest.mock('@/components/AuthContext', () => ({
    useAuth: () => ({ user: mockUser, refetch: jest.fn().mockResolvedValue(undefined) }),
}));

function renderWithProviders(ui: React.ReactElement) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <DisplayCurrencyProvider>{ui}</DisplayCurrencyProvider>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    mockUser = null;
    mockGet.mockReset();
    mockGet.mockImplementation(async (url: string) => {
        if (url === '/currency/rates') return { data: { rate: 0.092 } };
        return { data: { currencies: ['MAD', 'EUR', 'USD'] } };
    });
});

describe('CheckoutGuestForm (CIN removal)', () => {
    const baseProps = {
        trip: {
            sessions: [
                {
                    id: 'session-1',
                    startDate: '2027-05-10T00:00:00.000Z',
                    endDate: '2027-05-12T00:00:00.000Z',
                    availableSeats: 8,
                    price: 600,
                    currency: 'MAD',
                },
            ],
        },
        retryBooking: null,
        selectedSessionId: 'session-1',
        onSelectSession: jest.fn(),
        guestCount: 2,
        onGuestCountChange: jest.fn(),
        fullName: 'Launch Traveler',
        onFullNameChange: jest.fn(),
        phoneNumber: '+212600000000',
        onPhoneNumberChange: jest.fn(),
        language: 'en',
    };

    it('collects name and phone only — no CIN / passport field anywhere', () => {
        const { container } = renderWithProviders(<CheckoutGuestForm {...baseProps} />);

        expect(screen.getByLabelText(/full name/i)).not.toBeNull();
        expect(screen.getByLabelText(/phone number/i)).not.toBeNull();
        expect(screen.queryByText(/CIN or Passport/i)).toBeNull();
        expect(container.querySelector('#document-number')).toBeNull();
        expect(container.querySelector('input[name="document-number"]')).toBeNull();
    });

    it('tells the traveller the agency may check ID at departure', () => {
        renderWithProviders(<CheckoutGuestForm {...baseProps} />);
        expect(screen.getByText(/may check your ID at departure/i)).not.toBeNull();
        expect(screen.getByText(/never ask for your ID number online/i)).not.toBeNull();
    });

    it('still wires the name and phone inputs', () => {
        const onFullNameChange = jest.fn();
        const onPhoneNumberChange = jest.fn();
        renderWithProviders(
            <CheckoutGuestForm
                {...baseProps}
                onFullNameChange={onFullNameChange}
                onPhoneNumberChange={onPhoneNumberChange}
            />,
        );

        fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Amina' } });
        fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+212611111111' } });

        expect(onFullNameChange).toHaveBeenCalledWith('Amina');
        expect(onPhoneNumberChange).toHaveBeenCalledWith('+212611111111');
    });
});

describe('CheckoutGuestForm display currency (#619)', () => {
    it('renders the session price badge converted into the display currency', async () => {
        mockUser = { id: 'u1', name: 'Sara', email: 's@x.io', role: 'TRAVELER', displayCurrency: 'EUR' };
        renderWithProviders(
            <CheckoutGuestForm
                trip={{
                    sessions: [
                        {
                            id: 'session-1',
                            startDate: '2027-05-10T00:00:00.000Z',
                            endDate: '2027-05-12T00:00:00.000Z',
                            availableSeats: 8,
                            price: 600,
                            currency: 'MAD',
                        },
                    ],
                }}
                retryBooking={null}
                selectedSessionId="session-1"
                onSelectSession={jest.fn()}
                guestCount={2}
                onGuestCountChange={jest.fn()}
                fullName="Launch Traveler"
                onFullNameChange={jest.fn()}
                phoneNumber="+212600000000"
                onPhoneNumberChange={jest.fn()}
                language="en"
            />,
        );
        // 600 MAD x 0.092 = EUR 55.20
        expect(await screen.findByText(/55\.20/)).toBeTruthy();
    });
});
