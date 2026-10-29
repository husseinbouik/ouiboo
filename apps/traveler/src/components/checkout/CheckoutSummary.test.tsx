import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckoutSummary } from './CheckoutSummary';
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

const en = mockEnTranslations.checkout;
const baseProps = {
    trip: {
        title: 'Atlas Trek',
        startLocation: 'Tangier',
        images: [],
        agency: { companyName: 'Atlas Adventures' },
    },
    sessionDateLabel: '10 May 2027 - 12 May 2027',
    guestCount: 2,
    totalPrice: 1200,
    selectedCurrency: 'MAD',
    language: 'en',
    errorMessage: null,
    isSubmitting: false,
    canSubmit: true,
    onSubmit: jest.fn(),
};

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

describe('CheckoutSummary (#424 localized totals)', () => {
    it('renders localized labels and the full total when not staged', () => {
        renderWithProviders(<CheckoutSummary {...baseProps} />);
        expect(screen.getByText('Atlas Trek')).toBeTruthy();
        expect(screen.getByText(en.selectedDate)).toBeTruthy();
        expect(screen.getByText(en.guestCount)).toBeTruthy();
        expect(screen.getByText(en.subtotal)).toBeTruthy();
        expect(screen.getByText(en.serviceFee)).toBeTruthy();
        expect(screen.getByText(en.free)).toBeTruthy();
        expect(screen.getByText(en.totalToPay)).toBeTruthy();
        expect(screen.getByText(en.directPaymentNote)).toBeTruthy();
    });

    it('renders the staged deposit framing instead of the full total', () => {
        renderWithProviders(
            <CheckoutSummary
                {...baseProps}
                stagedAmounts={{ depositDue: 300, balanceDue: 900, total: 1200 }}
            />,
        );
        expect(screen.getByText(en.balanceAfterConfirmation)).toBeTruthy();
        expect(screen.getByText(en.depositToPayNow)).toBeTruthy();
        expect(screen.queryByText(en.totalToPay)).not.toBeTruthy();
    });
});

describe('CheckoutSummary display currency (#619)', () => {
    it('renders totals converted into the profile display currency and says the charge stays in MAD', async () => {
        mockUser = { id: 'u1', name: 'Sara', email: 's@x.io', role: 'TRAVELER', displayCurrency: 'EUR' };
        renderWithProviders(<CheckoutSummary {...baseProps} />);
        // 1200 MAD x 0.092 = EUR 110.40 — shown as subtotal AND total.
        expect(await screen.findAllByText(/110\.40/)).toHaveLength(2);
        expect(
            screen.getByText(
                en.displayCurrencyNote.replace('{{display}}', 'EUR').replace('{{charged}}', 'MAD'),
            ),
        ).toBeTruthy();
    });

    it('falls back to the session currency when no rate is available', async () => {
        mockUser = { id: 'u1', name: 'Sara', email: 's@x.io', role: 'TRAVELER', displayCurrency: 'EUR' };
        mockGet.mockImplementation(async (url: string) => {
            if (url === '/currency/rates') return { data: {} };
            return { data: { currencies: ['MAD', 'EUR', 'USD'] } };
        });
        renderWithProviders(<CheckoutSummary {...baseProps} />);
        expect(await screen.findAllByText(/1,200/)).toHaveLength(2);
        expect(screen.queryByText(/displayCurrencyNote/)).toBeNull();
    });
});
