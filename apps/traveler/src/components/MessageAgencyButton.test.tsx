/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import MessageAgencyButton from './MessageAgencyButton';
import en from '../../public/locales/en/translation.json';
import fr from '../../public/locales/fr/translation.json';
import ar from '../../public/locales/ar/translation.json';

// #729 (W12 regression): the button's label is resolved against the REAL
// locale files — PR #826's squash dropped `messages.messageAgency` (and
// the trip-page / booking-view mounts) after PR #822 had added them, and
// every remaining mount rendered the raw key. A key-shaped mock `t` would
// not catch that class of loss; this lookup does.
const locales: Record<string, any> = { en, fr, ar };
let mockLanguage = 'en';
let mockUser: { id: string } | null = { id: 'trav-1' };

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const value = key
                .split('.')
                .reduce<any>((acc, part) => (acc ? acc[part] : undefined), locales[mockLanguage]);
            return typeof value === 'string' ? value : key;
        },
        i18n: { language: mockLanguage },
    }),
}));

jest.mock('@/components/AuthContext', () => ({
    useAuth: () => ({ user: mockUser }),
}));

describe('MessageAgencyButton (#729)', () => {
    beforeEach(() => {
        mockLanguage = 'en';
        mockUser = { id: 'trav-1' };
    });

    it('renders the translated EN label (never the raw key) and links a signed-in traveller to the pair start screen', () => {
        render(<MessageAgencyButton agencyId="agency-1" agencyName="Atlas Adventures" />);
        const link = screen.getByRole('link');
        expect(link.textContent).toContain((en as any).messages.messageAgency);
        expect(link.textContent).not.toContain('messages.messageAgency');
        expect(link.getAttribute('href')).toBe(
            '/messages/start?agencyId=agency-1&agencyName=Atlas%20Adventures',
        );
    });

    it('renders the FR and AR labels from their own locale files', () => {
        mockLanguage = 'fr';
        const { unmount } = render(<MessageAgencyButton agencyId="agency-1" agencyName="Atlas" />);
        expect(screen.getByRole('link').textContent).toContain((fr as any).messages.messageAgency);
        unmount();
        mockLanguage = 'ar';
        render(<MessageAgencyButton agencyId="agency-1" agencyName="Atlas" />);
        expect(screen.getByRole('link').textContent).toContain((ar as any).messages.messageAgency);
    });

    it('routes a signed-out traveller through login with the start screen as the return path', () => {
        mockUser = null;
        render(<MessageAgencyButton agencyId="agency-1" agencyName="Atlas Adventures" />);
        const href = screen.getByRole('link').getAttribute('href') ?? '';
        expect(href.startsWith('/login?redirect=')).toBe(true);
        expect(decodeURIComponent(href.slice('/login?redirect='.length))).toBe(
            '/messages/start?agencyId=agency-1&agencyName=Atlas%20Adventures',
        );
    });

    it('renders nothing without an agency id', () => {
        const { container } = render(<MessageAgencyButton agencyId={null} agencyName="Atlas" />);
        expect(container.firstChild).toBeNull();
    });
});
