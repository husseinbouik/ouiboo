import React from 'react';
import { render, screen } from '@testing-library/react';
import { CheckoutHeader } from './CheckoutHeader';
import mockEnTranslations from '../../../public/locales/en/translation.json';

jest.mock('next/navigation', () => ({
    useRouter: () => ({ back: jest.fn() }),
}));

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

describe('CheckoutHeader (#424 localized chrome)', () => {
    it('renders the localized title, security note, steps and back label', () => {
        render(<CheckoutHeader />);
        const en = mockEnTranslations.checkout;
        expect(screen.getByRole('heading', { name: en.title })).toBeTruthy();
        expect(screen.getByText(en.secureProcess)).toBeTruthy();
        expect(screen.getByText(en.stepGuestDetails)).toBeTruthy();
        expect(screen.getByText(en.stepPayment)).toBeTruthy();
        expect(screen.getByText(en.stepConfirmation)).toBeTruthy();
        expect(screen.getByLabelText(en.progressLabel)).toBeTruthy();
        expect(screen.getByRole('button', { name: en.goBack })).toBeTruthy();
    });
});
