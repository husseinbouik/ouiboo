import React from 'react';
import { render, screen } from '@testing-library/react';
import SellerIdentity, { getSellerDisplay, isLicenceVerifiedForDisplay } from './SellerIdentity';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => {
            if (key === 'seller.organisedAndSoldBy') return `Organised and sold by ${options?.name}`;
            if (key === 'seller.licence') return `Travel-agent licence: ${options?.number}`;
            if (key === 'seller.poweredBy') return 'Powered by OuiBoo';
            return key;
        },
        i18n: { language: 'en' },
    }),
}));

describe('getSellerDisplay (#371)', () => {
    it('prefers the legal name over the commercial name', () => {
        const display = getSellerDisplay({
            companyName: 'Atlas Adventures',
            legalName: 'Atlas Adventures SARL',
            travelLicenceStatus: 'VERIFIED',
            travelLicenceNumber: 'AV-2024-0187',
        });
        expect(display.name).toBe('Atlas Adventures SARL');
        expect(display.licenceVerified).toBe(true);
        expect(display.licenceNumber).toBe('AV-2024-0187');
    });

    it('falls back to the commercial name when no legal name is set', () => {
        const display = getSellerDisplay({ companyName: 'Atlas Adventures' });
        expect(display.name).toBe('Atlas Adventures');
        expect(display.licenceVerified).toBe(false);
        expect(display.licenceNumber).toBeNull();
    });

    it('hides the licence number while the licence is not verified', () => {
        const display = getSellerDisplay({
            companyName: 'Atlas Adventures',
            travelLicenceStatus: 'PENDING_REVIEW',
            travelLicenceNumber: 'AV-2024-0187',
        });
        expect(display.licenceVerified).toBe(false);
        expect(display.licenceNumber).toBeNull();
    });

    it('hides the licence number when the licence has expired', () => {
        const display = getSellerDisplay({
            companyName: 'Atlas Adventures',
            travelLicenceStatus: 'VERIFIED',
            travelLicenceNumber: 'AV-2024-0187',
            licenceExpiry: '2020-01-01T00:00:00.000Z',
        });
        expect(display.licenceVerified).toBe(false);
        expect(display.licenceNumber).toBeNull();
    });

    it('honours the API-derived licenceVerified flag from the public endpoint', () => {
        expect(isLicenceVerifiedForDisplay({ licenceVerified: true })).toBe(true);
        expect(isLicenceVerifiedForDisplay({ licenceVerified: false, travelLicenceStatus: 'VERIFIED' })).toBe(false);
    });
});

describe('SellerIdentity (#371)', () => {
    it('renders the seller block with the licence number for a verified agency', () => {
        render(
            <SellerIdentity
                agency={{
                    companyName: 'Atlas Adventures',
                    legalName: 'Atlas Adventures SARL',
                    travelLicenceStatus: 'VERIFIED',
                    travelLicenceNumber: 'AV-2024-0187',
                }}
            />,
        );

        expect(screen.getByTestId('seller-identity')).not.toBeNull();
        expect(screen.getByText(/Organised and sold by Atlas Adventures SARL/)).not.toBeNull();
        expect(screen.getByText(/Travel-agent licence: AV-2024-0187/)).not.toBeNull();
        expect(screen.getByText('Powered by OuiBoo')).not.toBeNull();
    });

    it('renders the seller name without a licence line when unverified', () => {
        render(
            <SellerIdentity
                agency={{
                    companyName: 'Atlas Adventures',
                    travelLicenceStatus: 'NOT_SUBMITTED',
                    travelLicenceNumber: null,
                }}
            />,
        );

        expect(screen.getByText(/Organised and sold by Atlas Adventures/)).not.toBeNull();
        expect(screen.queryByText(/Travel-agent licence/)).toBeNull();
    });

    it('renders nothing without an agency', () => {
        const { container } = render(<SellerIdentity agency={null} />);
        expect(container.firstChild).toBeNull();
    });
});
