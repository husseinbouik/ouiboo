/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { VerificationStatus } from '@ouiboo/types';
import AgencyReviewModal from './AgencyReviewModal';
import { bankHolderNameMatches, canVerifyBankDetails, insuranceInsuredNameMatches } from './formatters';
import type { AdminAgency } from './types';

const t = (key: string) => key;

const baseAgency: AdminAgency = {
  id: 'agency-1',
  companyName: 'Atlas Tours',
  legalName: 'Atlas Tours SARL',
  verificationStatus: VerificationStatus.Pending,
  travelLicenceType: 'ODV',
  travelLicenceNumber: 'ODV-2026-001',
  travelLicenceStatus: 'PENDING_REVIEW',
  licenceExpiry: '2027-06-01T00:00:00.000Z',
  licenceDocumentKey: 'private/user-1/licence.pdf',
  licenceDocumentName: 'licence.pdf',
  insuranceStatus: 'PENDING_REVIEW',
  insuranceInsurer: 'AXA Assurance',
  insurancePolicyNumber: 'POL-2026-1',
  insuranceInsuredName: 'Atlas Tours SARL',
  insuranceValidFrom: '2026-01-01T00:00:00.000Z',
  insuranceExpiry: '2027-01-01T00:00:00.000Z',
  insuranceCoverageLimit: '1000000',
  insuranceCertificateKey: 'private/user-1/certificate.pdf',
  bankDetailsStatus: 'PENDING_REVIEW',
  pendingBankDetails: 'RIB: 123456789',
  bankAccountHolderName: 'Atlas Tours SARL',
  bankAttestationUrl: 'https://example.com/attestation.pdf',
  user: { id: 'user-1', name: 'Owner', email: 'owner@example.com' },
};

function renderModal(overrides: Partial<AdminAgency> = {}) {
  const handlers = {
    onClose: jest.fn(),
    onVerify: jest.fn(),
    onVerifyLicence: jest.fn(),
    onVerifyInsurance: jest.fn(),
    onVerifyBankDetails: jest.fn(),
    onViewDocument: jest.fn(),
  };
  const utils = render(
    <AgencyReviewModal
      t={t}
      agency={{ ...baseAgency, ...overrides }}
      agencyFeedback={null}
      isVerifying={false}
      isVerifyingLicence={false}
      isVerifyingInsurance={false}
      isVerifyingBankDetails={false}
      {...handlers}
    />,
  );
  return { ...utils, handlers };
}

describe('AgencyReviewModal licence review (#415)', () => {
  it('keeps licence verify disabled until the Ministry check is ticked, then attests', () => {
    const { handlers } = renderModal();
    const verify = screen.getByRole('button', { name: 'dashboard.actions.verifyLicence' });
    expect(verify).toHaveProperty('disabled', true);

    fireEvent.click(screen.getByLabelText('dashboard.labels.ministryCheck'));
    expect(verify).toHaveProperty('disabled', false);

    fireEvent.click(verify);
    expect(handlers.onVerifyLicence).toHaveBeenCalledWith('agency-1', 'VERIFIED', { ministryChecked: true });
  });

  it('opens the licence document and the insurance certificate through the signed-url handler', () => {
    const { handlers } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.actions.viewDocument' }));
    expect(handlers.onViewDocument).toHaveBeenCalledWith('private/user-1/licence.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.actions.viewCertificate' }));
    expect(handlers.onViewDocument).toHaveBeenCalledWith('private/user-1/certificate.pdf');
  });

  it('renders a missing expiry as a blocking warning, not N/A', () => {
    renderModal({ licenceExpiry: null });
    expect(screen.getAllByText('dashboard.labels.expiryMissing').length).toBeGreaterThan(0);
  });

  it('flags a missing licence document instead of offering a viewer', () => {
    renderModal({ licenceDocumentKey: null, licenceDocumentName: null });
    expect(screen.getByText('dashboard.messages.noLicenceDocument')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'dashboard.actions.viewDocument' })).toBeNull();
  });

  it('shows the recorded Ministry stamp when one exists', () => {
    renderModal({ licenceMinistryCheckedAt: '2026-10-20T00:00:00.000Z' });
    expect(screen.getByText(/dashboard\.labels\.ministryCheckedOn/)).not.toBeNull();
  });
});

describe('AgencyReviewModal insurance review (#415)', () => {
  it('verifies insurance, and passes the typed reason on rejection', () => {
    const { handlers, container } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.actions.verifyInsurance' }));
    expect(handlers.onVerifyInsurance).toHaveBeenCalledWith('agency-1', 'VERIFIED');

    const reason = container.querySelector('#insurance-rejection-reason') as HTMLInputElement;
    fireEvent.change(reason, { target: { value: 'Certificate illegible' } });
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.actions.rejectInsurance' }));
    expect(handlers.onVerifyInsurance).toHaveBeenCalledWith('agency-1', 'REJECTED', 'Certificate illegible');
  });

  it('flags an insured name that does not match the legal name (visual only)', () => {
    renderModal({ insuranceInsuredName: 'Unrelated Person' });
    expect(screen.getByText(/dashboard\.labels\.insuredNameMismatch/)).not.toBeNull();
    // The flag never blocks the insurance decision by itself.
    expect(screen.getByRole('button', { name: 'dashboard.actions.verifyInsurance' })).toHaveProperty('disabled', false);
  });

  it('renders no insurance actions once the artefact is verified', () => {
    renderModal({ insuranceStatus: 'VERIFIED', insuranceExpiry: '2027-01-01T00:00:00.000Z' });
    expect(screen.queryByRole('button', { name: 'dashboard.actions.verifyInsurance' })).toBeNull();
  });
});

describe('AgencyReviewModal bank-details review (#421)', () => {
  it('verifies directly when the holder matches the agency legal name', () => {
    const { handlers, container } = renderModal();
    expect(container.querySelector('#bank-override-reason')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.actions.verifyBankDetails' }));
    expect(handlers.onVerifyBankDetails).toHaveBeenCalledWith('agency-1', 'VERIFIED', { overrideReason: undefined });
  });

  it('blocks verification on a holder mismatch until an override reason is recorded', () => {
    const { handlers, container } = renderModal({ bankAccountHolderName: 'Third Party Person' });
    expect(screen.getByText(/dashboard\.labels\.bankHolderMismatch/)).not.toBeNull();
    const verify = screen.getByRole('button', { name: 'dashboard.actions.verifyBankDetails' });
    expect(verify).toHaveProperty('disabled', true);

    const override = container.querySelector('#bank-override-reason') as HTMLInputElement;
    fireEvent.change(override, { target: { value: 'Trade-name account, attestation sighted' } });
    expect(verify).toHaveProperty('disabled', false);
    fireEvent.click(verify);
    expect(handlers.onVerifyBankDetails).toHaveBeenCalledWith('agency-1', 'VERIFIED', {
      overrideReason: 'Trade-name account, attestation sighted',
    });
  });

  it('requires a reason before bank details can be rejected (API contract)', () => {
    const { handlers, container } = renderModal();
    const reject = screen.getByRole('button', { name: 'dashboard.actions.rejectBankDetails' });
    expect(reject).toHaveProperty('disabled', true);

    const reason = container.querySelector('#bank-rejection-reason') as HTMLInputElement;
    fireEvent.change(reason, { target: { value: 'Attestation does not match the RIB' } });
    expect(reject).toHaveProperty('disabled', false);
    fireEvent.click(reject);
    expect(handlers.onVerifyBankDetails).toHaveBeenCalledWith('agency-1', 'REJECTED', {
      reason: 'Attestation does not match the RIB',
    });
  });

  it('renders no bank actions when nothing is pending review', () => {
    renderModal({ bankDetailsStatus: 'VERIFIED', pendingBankDetails: null, bankDetails: 'RIB: 123456789' });
    expect(screen.queryByRole('button', { name: 'dashboard.actions.verifyBankDetails' })).toBeNull();
  });
});

describe('holder/insured name match helpers (#415/#421)', () => {
  it('matches case- and whitespace-insensitively against legal or trade name', () => {
    expect(bankHolderNameMatches({ bankAccountHolderName: '  atlas tours   sarl ', legalName: 'Atlas Tours SARL' })).toBe(true);
    expect(bankHolderNameMatches({ bankAccountHolderName: 'Atlas Tours', companyName: 'Atlas Tours' })).toBe(true);
    expect(bankHolderNameMatches({ bankAccountHolderName: 'Someone Else', legalName: 'Atlas Tours SARL', companyName: 'Atlas Tours' })).toBe(false);
    expect(bankHolderNameMatches({ bankAccountHolderName: null, legalName: 'Atlas Tours SARL' })).toBeNull();
    expect(insuranceInsuredNameMatches({ insuranceInsuredName: 'Atlas Tours SARL', legalName: 'Atlas Tours SARL' })).toBe(true);
    expect(insuranceInsuredNameMatches({ insuranceInsuredName: null, legalName: 'Atlas Tours SARL' })).toBeNull();
  });

  it('gates bank decisions on a pending submission', () => {
    expect(canVerifyBankDetails('PENDING_REVIEW', 'RIB x')).toBe(true);
    expect(canVerifyBankDetails('PENDING_REVIEW', null)).toBe(false);
    expect(canVerifyBankDetails('VERIFIED', 'RIB x')).toBe(false);
  });
});
