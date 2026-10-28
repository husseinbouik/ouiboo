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

    it('publishes no inbox while none is configured (Session #3 P0-7a)', () => {
        // The old contract defaulted to support@ouiboo.com — an address
        // on a domain with no DNS, so mail to it could never arrive.
        // P0-7a: the address renders ONLY when NEXT_PUBLIC_SUPPORT_EMAIL
        // configures one (the configured case is covered in
        // lib/support.test.ts); the test env configures none.
        render(<TravelerSupportPage />);

        expect(screen.queryByRole('link', { name: /@/ })).toBeNull();
        expect(document.body.textContent).not.toContain('@ouiboo.com');
    });
});
