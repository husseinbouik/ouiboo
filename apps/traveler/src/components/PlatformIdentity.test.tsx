import React from 'react';
import { render, screen } from '@testing-library/react';
import PlatformIdentity from './PlatformIdentity';

const mockSupportState = {
    SUPPORT_EMAIL: null as string | null,
    SUPPORT_PHONE: null as string | null,
    isSupportEmailConfigured: false,
    isSupportPhoneConfigured: false,
    supportMailto: () => null as string | null,
    supportWhatsAppHref: null as string | null,
};

jest.mock('@/lib/support', () => ({
    get SUPPORT_EMAIL() {
        return mockSupportState.SUPPORT_EMAIL;
    },
    get SUPPORT_PHONE() {
        return mockSupportState.SUPPORT_PHONE;
    },
    get isSupportEmailConfigured() {
        return mockSupportState.isSupportEmailConfigured;
    },
    get isSupportPhoneConfigured() {
        return mockSupportState.isSupportPhoneConfigured;
    },
    supportMailto: () => mockSupportState.supportMailto(),
    get supportWhatsAppHref() {
        return mockSupportState.supportWhatsAppHref;
    },
}));

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => {
            if (key === 'platformIdentity.title') return 'About Ouiboo';
            if (key === 'platformIdentity.technology')
                return 'Ouiboo is a technology platform. Trips are organised and sold by the agency named on this page.';
            if (key === 'platformIdentity.support') return `Support: ${options?.email}`;
            if (key === 'platformIdentity.whatsapp') return `Active-trip escalation on WhatsApp: ${options?.phone}`;
            if (key === 'platformIdentity.complaints') return `Complaints: email ${options?.email} with your booking reference.`;
            if (key === 'platformIdentity.complaintsNoEmail') return 'Complaints: use the contacts on your booking page.';
            return key;
        },
        i18n: { language: 'en' },
    }),
}));

describe('PlatformIdentity (#627)', () => {
    beforeEach(() => {
        mockSupportState.SUPPORT_EMAIL = null;
        mockSupportState.SUPPORT_PHONE = null;
        mockSupportState.isSupportEmailConfigured = false;
        mockSupportState.isSupportPhoneConfigured = false;
        mockSupportState.supportMailto = () => null;
        mockSupportState.supportWhatsAppHref = null;
    });

    it('always renders the name + technology-platform line, with the in-app complaints path when no channel is configured', () => {
        render(<PlatformIdentity />);
        expect(screen.getByTestId('platform-identity')).not.toBeNull();
        expect(screen.getByText('About Ouiboo')).not.toBeNull();
        expect(screen.getByText(/technology platform/)).not.toBeNull();
        expect(screen.getByText(/Contacts on your booking page/i)).not.toBeNull();
        // No configured channel -> nothing is fabricated.
        expect(screen.queryByText(/Support:/)).toBeNull();
        expect(screen.queryByText(/WhatsApp/)).toBeNull();
    });

    it('renders the configured support email and WhatsApp escalation', () => {
        mockSupportState.SUPPORT_EMAIL = 'help@example.org';
        mockSupportState.isSupportEmailConfigured = true;
        mockSupportState.supportMailto = () => 'mailto:help@example.org';
        mockSupportState.SUPPORT_PHONE = '+212 6 12 34 56 78';
        mockSupportState.isSupportPhoneConfigured = true;
        mockSupportState.supportWhatsAppHref = 'https://wa.me/212612345678';

        render(<PlatformIdentity />);
        const mail = screen.getByText('Support: help@example.org') as HTMLAnchorElement;
        expect(mail.getAttribute('href')).toBe('mailto:help@example.org');
        const wa = screen.getByText(/WhatsApp: \+212 6 12 34 56 78/) as HTMLAnchorElement;
        expect(wa.getAttribute('href')).toBe('https://wa.me/212612345678');
        expect(screen.getByText(/Complaints: email help@example.org/)).not.toBeNull();
    });
});
