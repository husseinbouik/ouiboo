import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckoutPayment } from './CheckoutPayment';
import { DisplayCurrencyProvider } from '@/lib/display-currency';
import mockEnTranslations from '../../../public/locales/en/translation.json';

jest.mock('react-i18next', () => {
    // #424: resolve keys against the real English locale file so the
    // assertions below read the shipped copy, not raw key names.
    const React = jest.requireActual('react');
    const lookup = (key: string): unknown =>
        key.split('.').reduce<any>((acc, part) => acc?.[part], mockEnTranslations);
    return {
        // Minimal <Trans> (#655): resolve the key against the real
        // locale file, interpolate {{values}}, and wrap <tag>…</tag>
        // segments in the matching `components` entry — enough to
        // render the bidi-isolated currency notes for real.
        Trans: ({ i18nKey, values, components }: any) => {
            const raw = lookup(i18nKey);
            if (typeof raw !== 'string') return React.createElement(React.Fragment, null, i18nKey);
            const interpolate = (s: string) => {
                let out = s;
                if (values) {
                    for (const [name, replacement] of Object.entries(values)) {
                        out = out.replaceAll(`{{${name}}}`, String(replacement));
                    }
                }
                return out;
            };
            const parts: unknown[] = [];
            const tagPattern = /<(\w+)>(.*?)<\/\1>/g;
            let lastIndex = 0;
            let match: RegExpExecArray | null;
            let k = 0;
            while ((match = tagPattern.exec(raw)) !== null) {
                if (match.index > lastIndex) parts.push(interpolate(raw.slice(lastIndex, match.index)));
                const component = components?.[match[1]];
                const inner = interpolate(match[2]);
                parts.push(component ? React.cloneElement(component, { key: k++ }, inner) : inner);
                lastIndex = match.index + match[0].length;
            }
            if (lastIndex < raw.length) parts.push(interpolate(raw.slice(lastIndex)));
            return React.createElement(React.Fragment, null, ...parts);
        },
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

describe('CheckoutPayment display currency (#619, corrected by #655)', () => {
    it('names the MAD deposit as the amount to transfer, with the EUR figure reference-only (#655)', async () => {
        mockUser = { id: 'u1', name: 'Sara', email: 's@x.io', role: 'TRAVELER', displayCurrency: 'EUR' };
        const { container } = renderWithProviders(
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
        // #655: the transfer instruction itself names the SESSION
        // currency amount — 300 MAD is the deposit to transfer, NOT
        // the €27.60 conversion the pre-fix copy put in this
        // sentence (the behaviour the old #619 test pinned).
        const body = await screen.findByText(
            (_, el) => el?.tagName === 'P' && /You pay a deposit of/.test(el.textContent ?? ''),
        );
        expect(body.textContent).toMatch(/MAD\s300\.00/);
        expect(body.textContent).not.toContain('27.60');
        // The converted figure (300 MAD x 0.092 = EUR 27.60) appears
        // only beside the instruction, explicitly labelled
        // reference-only…
        const reference = await screen.findByText(
            (_, el) => el?.tagName === 'P' && /For reference only/.test(el.textContent ?? ''),
        );
        expect(reference.textContent).toContain('27.60');
        // …and the charge-currency note sits adjacent to the
        // instruction with both currency codes bidi-isolated.
        expect(
            screen.getByText(
                (_, el) =>
                    el?.tagName === 'P' &&
                    el.textContent === 'Shown in EUR for reference — you will pay in MAD.',
            ),
        ).toBeTruthy();
        const bdis = Array.from(container.querySelectorAll('bdi')).map((b) => b.textContent);
        expect(bdis).toEqual(expect.arrayContaining(['EUR', 'MAD']));
    });
});
