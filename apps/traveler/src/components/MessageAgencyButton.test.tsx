/**
 * #729 (Council S7-2) regression pin (W12): the chat door must render
 * the TRANSLATED label, never the raw i18n key. PR #826 dropped
 * `messages.messageAgency` (and the other #822 keys) from all three
 * locales, so the surviving storefront / checkout-confirmation mounts
 * rendered the literal string "messages.messageAgency". This test
 * translates through the REAL en locale file, so a missing key falls
 * back to the raw key exactly like i18next and fails here.
 *
 * Guardrails pinned: the door is traveller-initiated only — a signed-in
 * traveller goes straight to the start screen for that agency pair,
 * a guest is routed through sign-in first (with the start screen as
 * the post-login redirect), and no agency id renders nothing.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import MessageAgencyButton from './MessageAgencyButton';

let mockUser: { id: string } | null = null;

jest.mock('next/link', () => {
    const Link = ({ children, href, ...props }: any) => (
        <a href={href} {...props}>
            {children}
        </a>
    );
    return Link;
});

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const en = require('../../public/locales/en/translation.json');
            const value = key
                .split('.')
                .reduce((node: any, part: string) => (node ? node[part] : undefined), en);
            // i18next returns the key itself when a translation is missing.
            return typeof value === 'string' ? value : key;
        },
        i18n: { language: 'en' },
    }),
}));

jest.mock('@/components/AuthContext', () => ({
    useAuth: () => ({ user: mockUser }),
}));

const START_HREF = '/messages/start?agencyId=agency-1&agencyName=Atlas%20Adventures';

describe('MessageAgencyButton (#729)', () => {
    it('renders the translated label, not the raw messages.messageAgency key', () => {
        mockUser = { id: 'trav-1' };
        render(<MessageAgencyButton agencyId="agency-1" agencyName="Atlas Adventures" />);
        expect(screen.getByText('Message the agency')).not.toBeNull();
        expect(screen.queryByText('messages.messageAgency')).toBeNull();
    });

    it('signed-in: links straight to the traveller-initiated start screen', () => {
        mockUser = { id: 'trav-1' };
        render(<MessageAgencyButton agencyId="agency-1" agencyName="Atlas Adventures" />);
        const link = screen.getByRole('link', { name: /Message the agency/ });
        expect(link.getAttribute('href')).toBe(START_HREF);
    });

    it('signed-out: routes through sign-in first, back to the start screen after login', () => {
        mockUser = null;
        render(<MessageAgencyButton agencyId="agency-1" agencyName="Atlas Adventures" />);
        const link = screen.getByRole('link', { name: /Message the agency/ });
        expect(link.getAttribute('href')).toBe(`/login?redirect=${encodeURIComponent(START_HREF)}`);
    });

    it('renders nothing without an agency id', () => {
        mockUser = { id: 'trav-1' };
        const { container } = render(<MessageAgencyButton agencyId={null} agencyName="Atlas Adventures" />);
        expect(container.firstChild).toBeNull();
    });
});
