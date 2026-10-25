import React from 'react';
import { render, screen } from '@testing-library/react';
import { CheckoutPayment } from './CheckoutPayment';
import mockEnTranslations from '../../../public/locales/en/translation.json';

jest.mock('react-i18next', () => {
    // #424: resolve keys against the real English locale file so the
    // assertions below read the shipped copy, not raw key names.
    const lookup = (key: string): unknown =>
        key.split('.').reduce<any>((acc, part) => acc?.[part], mockEnTranslations);
    return {
        useTranslation: () => ({
            t: (key: string, options?: Record<string, unknown>) => {
                let value = lookup(key);
                if (typeof value !== 'string') return key;
                if (options) {
                    for (const [name, replacement] of Object.entries(options)) {
                        value = (value as string).replaceAll(`{{${name}}}`, String(replacement));
                    }
                }
                return value;
            },
            i18n: { language: 'en' },
        }),
    };
});

const en = mockEnTranslations.checkout;
const baseProps = {
    bankDetails: 'CIH Bank — RIB 230 640 0000000000000000 00',
    hasBankDetails: true,
    proofPreview: null,
    onProofUpload: jest.fn(),
    onClearProof: jest.fn(),
    proofFile: null,
    isUploading: false,
};

describe('CheckoutPayment (#424 localized payment step)', () => {
    it('renders the bank-transfer block and upload step in the shipped copy', () => {
        render(<CheckoutPayment {...baseProps} />);
        expect(screen.getByText(en.bankTransfer)).toBeTruthy();
        expect(screen.getByText(en.bankTransferTitle)).toBeTruthy();
        expect(screen.getByText(en.bankInstructionsHint)).toBeTruthy();
        expect(screen.getByText(en.bankTransferInstructions)).toBeTruthy();
        expect(screen.getByText(baseProps.bankDetails)).toBeTruthy();
        expect(screen.getByText(en.proofDeadlineNotice)).toBeTruthy();
        expect(screen.getByText(en.uploadProofStep)).toBeTruthy();
        expect(screen.getByText(en.uploadWithin24h)).toBeTruthy();
    });

    it('shows the unavailable state when the agency has no bank details', () => {
        render(<CheckoutPayment {...baseProps} hasBankDetails={false} bankDetails="" />);
        expect(screen.getByText(en.paymentInstructionsUnavailable)).toBeTruthy();
        expect(screen.getByText(en.bookingUnavailable)).toBeTruthy();
    });

    it('renders the staged-payment terms with the agency name interpolated', () => {
        render(
            <CheckoutPayment
                {...baseProps}
                stagedInfo={{
                    depositDue: 300,
                    agencyName: 'Atlas Adventures',
                    minimumParticipants: 6,
                    confirmationDeadline: '2027-04-01T00:00:00.000Z',
                    currency: 'MAD',
                    language: 'en',
                }}
            />,
        );
        expect(
            screen.getByText(en.stagedTitle.replace('{{agencyName}}', 'Atlas Adventures')),
        ).toBeTruthy();
    });
});
