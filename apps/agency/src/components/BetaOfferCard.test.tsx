/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BetaOfferCard } from './BetaOfferCard';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, opts?: Record<string, unknown>) =>
            opts?.hours !== undefined ? `${key}:${opts.hours}` : key,
        i18n: { language: 'en' },
    }),
}));

describe('BetaOfferCard (#677)', () => {
    it('renders the three offer promises (verification carries no time-bound claim)', () => {
        render(<BetaOfferCard />);

        expect(screen.getByTestId('beta-offer-card')).not.toBeNull();
        expect(screen.getByText('betaOffer.verificationTitle')).not.toBeNull();
        expect(screen.getByText('betaOffer.verificationBody')).not.toBeNull();
        expect(screen.getByText('betaOffer.assistedTitle')).not.toBeNull();
        expect(screen.getByText('betaOffer.supportTitle')).not.toBeNull();
        expect(screen.getByText('betaOffer.supportBody:48')).not.toBeNull();
    });
});
