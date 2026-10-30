import React from 'react';
import { render, screen } from '@testing-library/react';
import VerificationRecord, { deriveVerificationRecord } from './VerificationRecord';
import SellerBlock, { sellerBlockFields } from './SellerBlock';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'en' },
    }),
}));

const verifiedAgency = {
    companyName: 'Atlas Adventures',
    legalName: 'Atlas Adventures SARL',
    travelLicenceType: 'ODV',
    travelLicenceNumber: 'AV-2024-0187',
    travelLicenceStatus: 'VERIFIED',
    licenceExpiry: '2027-10-24T00:00:00.000Z',
    licenceIssuingAuthority: 'Ministère du Tourisme',
    licenceVerifiedAt: '2026-10-24T00:00:00.000Z',
    insuranceStatus: 'VERIFIED',
    insuranceInsurer: 'AXA Assurance Maroc',
    insuranceExpiry: '2027-10-25T00:00:00.000Z',
    insuranceVerifiedAt: '2026-10-25T00:00:00.000Z',
    verificationStatus: 'VERIFIED',
};

describe('deriveVerificationRecord (#688)', () => {
    it('builds the record from flat agency fields with the latest check date', () => {
        const record = deriveVerificationRecord(verifiedAgency);
        expect(record.legalName).toBe('Atlas Adventures SARL');
        expect(record.licenceNumber).toBe('AV-2024-0187');
        expect(record.insurer).toBe('AXA Assurance Maroc');
        expect(record.checkedOn?.toISOString()).toBe('2026-10-25T00:00:00.000Z');
        expect(record.tripsPaused).toBe(false);
    });

    it('withholds licence and insurer facts when the checks have not passed', () => {
        const record = deriveVerificationRecord({
            ...verifiedAgency,
            travelLicenceStatus: 'PENDING_REVIEW',
            insuranceStatus: 'PENDING_REVIEW',
            verificationStatus: 'PENDING',
        });
        expect(record.licenceNumber).toBeNull();
        expect(record.insurer).toBeNull();
        expect(record.tripsPaused).toBe(true);
    });

    it('a lapsed licence pauses the record', () => {
        const record = deriveVerificationRecord(
            { ...verifiedAgency, licenceExpiry: '2025-01-01T00:00:00.000Z', verificationStatus: 'PENDING' },
            new Date('2026-06-01T00:00:00.000Z'),
        );
        expect(record.licenceNumber).toBeNull();
        expect(record.tripsPaused).toBe(true);
    });

    it('prefers the API-derived verificationRecord when present (#688 endpoint)', () => {
        const record = deriveVerificationRecord({
            companyName: 'Atlas Adventures',
            verificationRecord: {
                legalName: 'Atlas Adventures SARL',
                licenceNumber: 'AV-2024-0187',
                licenceType: 'ODV',
                issuingAuthority: 'Ministère du Tourisme',
                licenceExpiry: '2027-10-24T00:00:00.000Z',
                licenceStatus: 'VERIFIED',
                insurer: 'AXA Assurance Maroc',
                insuranceValidFrom: '2026-10-25T00:00:00.000Z',
                insuranceExpiry: '2027-10-25T00:00:00.000Z',
                insuranceStatus: 'VERIFIED',
                checkedOn: '2026-10-25T00:00:00.000Z',
                status: 'VERIFIED',
                tripsPaused: false,
            },
        });
        expect(record.checkedOn?.toISOString()).toBe('2026-10-25T00:00:00.000Z');
        expect(record.insuranceValidFrom?.toISOString()).toBe('2026-10-25T00:00:00.000Z');
        expect(record.tripsPaused).toBe(false);
    });
});

describe('VerificationRecord render (#688)', () => {
    it('renders the checkable fields and never any document reference', () => {
        render(<VerificationRecord agency={verifiedAgency} />);
        expect(screen.getByTestId('verification-record')).toBeTruthy();
        expect(screen.getByText(/AV-2024-0187/)).toBeTruthy();
        expect(screen.getByText(/AXA Assurance Maroc/)).toBeTruthy();
        expect(document.body.textContent).not.toContain('licenceDocumentKey');
        expect(document.body.textContent).not.toContain('insuranceCertificateKey');
    });
});

describe('sellerBlockFields (#700)', () => {
    it('maps the Art. 29(2) fields and reports gaps as null (never invented)', () => {
        expect(
            sellerBlockFields({
                legalName: 'Atlas Adventures SARL',
                businessAddress: '12, Avenue Mohammed V, Tanger',
                businessPhone: '+212600000000',
                rc: 'RC-123456',
                taxId: 'IF-987654',
            }),
        ).toEqual({
            name: 'Atlas Adventures SARL',
            address: '12, Avenue Mohammed V, Tanger',
            phone: '+212600000000',
            rc: 'RC-123456',
            taxId: 'IF-987654',
        });
        const partial = sellerBlockFields({ companyName: 'Atlas Adventures' });
        expect(partial.address).toBeNull();
        expect(partial.phone).toBeNull();
        expect(partial.rc).toBeNull();
        expect(partial.taxId).toBeNull();
    });

    it('renders the honest gap line for missing fields', () => {
        render(<SellerBlock agency={{ id: 'agency-1', companyName: 'Atlas Adventures' }} showRecordLink />);
        expect(screen.getByTestId('seller-block')).toBeTruthy();
        expect(screen.getAllByText('sellerBlock.notYetProvided').length).toBeGreaterThan(0);
        expect(screen.getByText('sellerBlock.incompleteNote')).toBeTruthy();
    });
});
