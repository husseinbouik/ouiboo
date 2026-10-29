import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckoutPayment } from './CheckoutPayment';
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
    bankDetails: 'CIH Bank — RIB 230 640 0000000000000000 00',
    hasBankDetails: true,
    proofPreview: null,
    onProofUpload: jest.fn(),
    onClearProof: jest.fn(),
    proofFile: null,
    isUploading: false,
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

describe('CheckoutPayment (#424 localized payment step)', () => {
    it('renders the bank-transfer block and upload step in the shipped copy', () => {
        renderWithProviders(<CheckoutPayment {...baseProps} />);
        // #568: bankTransferTitle now also ships as "Bank Transfer" in EN
        // (was the French "Virement Bancaire"), so the section heading
        // (checkout.bankTransfer, <h2>) and the block heading
        // (checkout.bankTransferTitle, <h4>) share the same text and a
        // single-match getByText throws on multiple elements. Assert both
        // headings render the shipped copy instead.
        expect(screen.getAllByText(en.bankTransfer)).toHaveLength(2);
        expect(
            screen.getByRole('heading', { level: 2, name: en.bankTransfer }),
        ).toBeTruthy();
        expect(
            screen.getByRole('heading', { level: 4, name: en.bankTransferTitle }),
        ).toBeTruthy();
        expect(screen.getByText(en.bankInstructionsHint)).toBeTruthy();
        expect(screen.getByText(en.bankTransferInstructions)).toBeTruthy();
        expect(screen.getByText(baseProps.bankDetails)).toBeTruthy();
        expect(screen.getByText(en.proofDeadlineNotice)).toBeTruthy();
        expect(screen.getByText(en.uploadProofStep)).toBeTruthy();
        expect(screen.getByText(en.uploadWithin24h)).toBeTruthy();
    });

    it('shows the unavailable state when the agency has no bank details', () => {
        renderWithProviders(<CheckoutPayment {...baseProps} hasBankDetails={false} bankDetails="" />);
        expect(screen.getByText(en.paymentInstructionsUnavailable)).toBeTruthy();
        expect(screen.getByText(en.bookingUnavailable)).toBeTruthy();
    });

    it('renders the staged-payment terms with the agency name interpolated', () => {
        renderWithProviders(
            <CheckoutPayment
                {...baseProps}
                stagedInfo={{
                    depositDue: 300,
                    agencyName: 'Atlas Adventures',
                    minimumParticipants: 6,
                    confirmationDeadline: '2027-04-01T00:00:00.000Z',
                    currency: 'MAD',
                    language: 'en',
                }}
            />,
        );
        expect(
            screen.getByText(en.stagedTitle.replace('{{agencyName}}', 'Atlas Adventures')),
        ).toBeTruthy();
    });
});

describe('CheckoutPayment display currency (#619)', () => {
    it('quotes the staged deposit in the display currency', async () => {
        mockUser = { id: 'u1', name: 'Sara', email: 's@x.io', role: 'TRAVELER', displayCurrency: 'EUR' };
        renderWithProviders(
            <CheckoutPayment
                {...baseProps}
                stagedInfo={{
                    depositDue: 300,
                    agencyName: 'Atlas Adventures',
                    minimumParticipants: 6,
                    confirmationDeadline: '2027-04-01T00:00:00.000Z',
                    currency: 'MAD',
                    language: 'en',
                }}
            />,
        );
        // 300 MAD x 0.092 = EUR 27.60 inside the staged body copy.
        expect(await screen.findByText(/27\.60/)).toBeTruthy();
    });
});
