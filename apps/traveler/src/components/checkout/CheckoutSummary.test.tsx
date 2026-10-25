import React from 'react';
import { render, screen } from '@testing-library/react';
import { CheckoutSummary } from './CheckoutSummary';
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

describe('CheckoutSummary (#424 localized totals)', () => {
    it('renders localized labels and the full total when not staged', () => {
        render(<CheckoutSummary {...baseProps} />);
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
        render(
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
