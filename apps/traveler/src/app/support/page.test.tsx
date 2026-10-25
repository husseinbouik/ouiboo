/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import TravelerSupportPage from './page';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'en' },
    }),
}));

describe('TravelerSupportPage (#419)', () => {
    it('publishes both support lanes, refunds and complaints sections', () => {
        render(<TravelerSupportPage />);

        expect(screen.getByText('support.title')).not.toBeNull();
        expect(screen.getByText('support.normalTitle')).not.toBeNull();
        expect(screen.getByText('support.emergencyTitle')).not.toBeNull();
        expect(screen.getByText('support.refundsTitle')).not.toBeNull();
        expect(screen.getByText('support.complaintsTitle')).not.toBeNull();
        expect(screen.getByText('support.safetyNote')).not.toBeNull();
    });

    it('links the published support inbox', () => {
        render(<TravelerSupportPage />);

        const mail = screen.getByRole('link', { name: /support@ouiboo\.com/ });
        expect(mail.getAttribute('href')).toBe('mailto:support@ouiboo.com');
    });
});
