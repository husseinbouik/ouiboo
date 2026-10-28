import React from 'react';
import { render, screen } from '@testing-library/react';
import { CheckoutDisclaimer } from './CheckoutDisclaimer';
import mockEnTranslations from '../../../public/locales/en/translation.json';

jest.mock('react-i18next', () => {
    // #424: resolve keys against the real English locale file so the
    // assertions below read the shipped copy, not raw key names.
    const lookup = (key: string): unknown =>
        key.split('.').reduce<any>((acc, part) => acc?.[part], mockEnTranslations);
    return {
        useTranslation: () => ({
            t: (key: string) => {
                const value = lookup(key);
                return typeof value === 'string' ? value : key;
            },
            i18n: { language: 'en' },
        }),
    };
});

describe('CheckoutDisclaimer (#424)', () => {
    it('shows the disclaimer and the prevailing-language clause', () => {
        render(<CheckoutDisclaimer />);
        const en = mockEnTranslations.checkout;
        expect(screen.getByText(en.disclaimerTitle)).toBeTruthy();
        expect(screen.getByText(en.disclaimerBody)).toBeTruthy();
        // The binding clause: French prevails in case of divergence.
        expect(screen.getByText(en.prevailingLanguage)).toBeTruthy();
        expect(en.prevailingLanguage).toContain('French');
    });
});
