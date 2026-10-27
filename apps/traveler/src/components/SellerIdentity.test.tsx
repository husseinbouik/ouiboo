import React from 'react';
import { render, screen } from '@testing-library/react';
import SellerIdentity, { getSellerDisplay, getVerificationChecks, isLicenceVerifiedForDisplay } from './SellerIdentity';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => {
            if (key === 'seller.organisedAndSoldBy') return `Organised and sold by ${options?.name}`;
            if (key === 'seller.licence') return `Travel-agent licence: ${options?.number}`;
            if (key === 'seller.licenceTyped') return `Travel-agent licence: ${options?.type} ${options?.number}`;
            if (key === 'seller.licenceIssued') return `Issued on ${options?.date} by ${options?.authority}`;
            if (key === 'seller.licenceDetailsPending') return 'Licence issue details are being confirmed with the agency.';
            if (key === 'seller.licenceChecked') return `Licence document checked on ${options?.date}`;
            if (key === 'seller.insuranceEvidenced') return `RC insurance evidenced on ${options?.date}`;
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

describe('seller block issue data (B4)', () => {
    const verifiedAgency = {
        companyName: 'Atlas Adventures',
        legalName: 'Atlas Adventures SARL',
        travelLicenceStatus: 'VERIFIED',
        travelLicenceType: 'ODV',
        travelLicenceNumber: 'AV-2024-0187',
        licenceIssuedAt: '2024-03-15T00:00:00.000Z',
        licenceIssuingAuthority: 'Ministère du Tourisme',
    };

    it('exposes the complete block — type, issue date, authority — when verified', () => {
        const display = getSellerDisplay(verifiedAgency);
        expect(display.licenceType).toBe('ODV');
        expect(display.licenceIssuedAt?.toISOString()).toBe('2024-03-15T00:00:00.000Z');
        expect(display.licenceIssuingAuthority).toBe('Ministère du Tourisme');
        expect(display.licenceDetailsPending).toBe(false);
    });

    it('withholds type, issue date, and authority while the licence is not verified', () => {
        const display = getSellerDisplay({ ...verifiedAgency, travelLicenceStatus: 'PENDING_REVIEW' });
        expect(display.licenceType).toBeNull();
        expect(display.licenceIssuedAt).toBeNull();
        expect(display.licenceIssuingAuthority).toBeNull();
        expect(display.licenceDetailsPending).toBe(false);
    });

    it('flags the legacy gap: verified but the issue data was never captured', () => {
        const display = getSellerDisplay({
            ...verifiedAgency,
            licenceIssuedAt: null,
            licenceIssuingAuthority: null,
        });
        expect(display.licenceDetailsPending).toBe(true);
    });

    it('renders type + number and the issued line for a complete verified record', () => {
        render(<SellerIdentity agency={verifiedAgency} />);
        expect(screen.getByText(/Travel-agent licence: ODV AV-2024-0187/)).not.toBeNull();
        expect(screen.getByText(/Issued on .* by Ministère du Tourisme/)).not.toBeNull();
        expect(screen.queryByText(/being confirmed with the agency/)).toBeNull();
    });

    it('renders the honest pending line for a legacy verified record', () => {
        render(
            <SellerIdentity
                agency={{ ...verifiedAgency, licenceIssuedAt: null, licenceIssuingAuthority: null }}
            />,
        );
        expect(screen.getByText(/Travel-agent licence: ODV AV-2024-0187/)).not.toBeNull();
        expect(screen.getByText(/Licence issue details are being confirmed with the agency/)).not.toBeNull();
        expect(screen.queryByText(/Issued on/)).toBeNull();
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

    it('renders the what+when checks line with the actual verification dates (#413)', () => {
        const licenceDate = new Date('2026-10-24T00:00:00.000Z');
        const insuranceDate = new Date('2026-10-25T00:00:00.000Z');
        const fmt = (d: Date) => new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(d);
        render(
            <SellerIdentity
                agency={{
                    companyName: 'Atlas Adventures',
                    legalName: 'Atlas Adventures SARL',
                    travelLicenceStatus: 'VERIFIED',
                    travelLicenceNumber: 'AV-2024-0187',
                    licenceVerifiedAt: licenceDate.toISOString(),
                    insuranceStatus: 'VERIFIED',
                    insuranceVerifiedAt: insuranceDate.toISOString(),
                }}
            />,
        );

        expect(
            screen.getByText(
                `Licence document checked on ${fmt(licenceDate)} · RC insurance evidenced on ${fmt(insuranceDate)}`,
            ),
        ).not.toBeNull();
    });

    it('omits the checks line when the stamps are missing (#413)', () => {
        render(
            <SellerIdentity
                agency={{
                    companyName: 'Atlas Adventures',
                    travelLicenceStatus: 'VERIFIED',
                    travelLicenceNumber: 'AV-2024-0187',
                }}
            />,
        );

        expect(screen.queryByText(/Licence document checked on/)).toBeNull();
        expect(screen.queryByText(/RC insurance evidenced on/)).toBeNull();
    });
});

describe('getVerificationChecks (#413)', () => {
    it('returns dates only for checks that passed', () => {
        const checks = getVerificationChecks({
            travelLicenceStatus: 'VERIFIED',
            licenceVerifiedAt: '2026-10-24T00:00:00.000Z',
            insuranceStatus: 'PENDING_REVIEW',
            insuranceVerifiedAt: '2026-10-25T00:00:00.000Z',
        });
        expect(checks.licenceCheckedDate?.toISOString()).toBe('2026-10-24T00:00:00.000Z');
        expect(checks.insuranceEvidencedDate).toBeNull();
    });

    it('returns no licence date when the licence is not verified', () => {
        const checks = getVerificationChecks({
            travelLicenceStatus: 'PENDING_REVIEW',
            licenceVerifiedAt: '2026-10-24T00:00:00.000Z',
        });
        expect(checks.licenceCheckedDate).toBeNull();
    });
});
