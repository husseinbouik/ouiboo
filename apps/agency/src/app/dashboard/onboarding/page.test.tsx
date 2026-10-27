/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OnboardingPage from './page';
import { apiClient } from '@/lib/api-client';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      let out = key;
      if (opts) {
        for (const v of Object.values(opts)) out += ` ${String(v)}`;
      }
      return out;
    },
  }),
}));

jest.mock('@/components/AuthContext', () => ({
  useAuth: () => ({
    user: (globalThis as Record<string, unknown>).__mockUser ?? null,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: { post: jest.fn() },
}));

const postMock = apiClient.post as jest.Mock;

const baseProfile = {
  id: 'a1',
  companyName: 'Atlas Voyages SARL',
  ice: '123456789012345',
  patente: 'PAT12345',
  rib: 'MA6400010001000100010001',
  bio: '',
  legalName: 'Atlas Voyages SARL',
  rc: '123456',
  taxId: 'IF123',
  legalRepresentative: 'Sara Bennani',
  businessAddress: 'Tangier',
  verificationStatus: 'VERIFIED',
  travelLicenceType: 'ODV',
  travelLicenceNumber: 'ODV-2026-001',
  travelLicenceStatus: 'VERIFIED',
  licenceExpiry: '2030-01-01T00:00:00.000Z',
  licenceRejectionReason: null,
  licenceDocumentKey: 'private/u1/licence.pdf',
  licenceDocumentName: 'licence.pdf',
  insuranceStatus: 'NOT_SUBMITTED',
  insuranceInsurer: null,
  insurancePolicyNumber: null,
  insuranceInsuredName: null,
  insuranceValidFrom: null,
  insuranceExpiry: null,
  insuranceCoverageLimit: null,
  insuranceCertificateKey: null,
  insuranceRejectionReason: null,
  verificationPausedAt: null,
  verificationPauseReason: null,
};

const setProfile = (profile: Record<string, unknown>) => {
  (globalThis as Record<string, unknown>).__mockUser = {
    id: 'u1',
    role: 'AGENCY',
    agencyProfile: profile,
  };
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <OnboardingPage />
    </QueryClientProvider>,
  );

describe('OnboardingPage (#415 agency UI)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    postMock.mockResolvedValue({ data: {} });
  });

  it('shows the licence document on file and the insurance section awaiting submission', async () => {
    setProfile(baseProfile);
    renderPage();
    expect(await screen.findByText('onboarding.documents.current licence.pdf')).not.toBeNull();
    expect(screen.getByText('onboarding.sections.insurance')).not.toBeNull();
    expect(screen.getByText('onboarding.insurance.status.NOT_SUBMITTED')).not.toBeNull();
    // The verified licence is locked; the insurance form stays editable.
    expect((screen.getByLabelText('onboarding.licence.numberLabel') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('onboarding.insurance.insurerLabel') as HTMLInputElement).disabled).toBe(false);
    // A verified licence + outstanding insurance must still be submittable.
    expect(screen.getByRole('button', { name: 'onboarding.submit' })).not.toBeNull();
  });

  it('warns that a licence without a document is incomplete', async () => {
    setProfile({
      ...baseProfile,
      travelLicenceStatus: 'NOT_SUBMITTED',
      licenceDocumentKey: null,
      licenceDocumentName: null,
    });
    renderPage();
    expect(await screen.findByText('onboarding.licence.documentRequired')).not.toBeNull();
  });

  it('shows the paused banner when the sweep paused the agency', async () => {
    setProfile({
      ...baseProfile,
      insuranceStatus: 'EXPIRED',
      insuranceExpiry: '2026-01-01T00:00:00.000Z',
      verificationPausedAt: '2026-10-25T02:00:00.000Z',
      verificationPauseReason: 'RC insurance expired on 2026-01-01',
    });
    renderPage();
    expect(await screen.findByText('verificationPaused.title')).not.toBeNull();
    expect(screen.getByText('RC insurance expired on 2026-01-01')).not.toBeNull();
  });

  it('restores the insurance fields from the profile on discard', async () => {
    setProfile({
      ...baseProfile,
      insuranceInsurer: 'Wafa Assurance',
      insurancePolicyNumber: 'RC-999',
    });
    renderPage();
    const insurer = (await screen.findByLabelText(
      'onboarding.insurance.insurerLabel',
    )) as HTMLInputElement;
    expect(insurer.value).toBe('Wafa Assurance');
    fireEvent.change(insurer, { target: { value: 'Changed' } });
    expect(insurer.value).toBe('Changed');
    fireEvent.click(screen.getByRole('button', { name: 'common.discardChanges' }));
    expect(insurer.value).toBe('Wafa Assurance');
  });

  it('lets a legacy verified agency supply the missing licence issue data (B4)', async () => {
    // baseProfile's licence is VERIFIED but predates the issue fields.
    setProfile(baseProfile);
    renderPage();
    const issuedAt = (await screen.findByLabelText(
      'onboarding.licence.issuedAtLabel',
    )) as HTMLInputElement;
    const authority = screen.getByLabelText(
      'onboarding.licence.issuingAuthorityLabel',
    ) as HTMLInputElement;
    // Exactly the two new fields are unlocked; the rest stays locked.
    expect(issuedAt.disabled).toBe(false);
    expect(authority.disabled).toBe(false);
    expect((screen.getByLabelText('onboarding.licence.numberLabel') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('onboarding.licence.issueDetailsRequired')).not.toBeNull();

    fireEvent.change(issuedAt, { target: { value: '2024-03-15' } });
    fireEvent.change(authority, { target: { value: 'Ministère du Tourisme' } });
    fireEvent.click(screen.getByRole('button', { name: 'onboarding.submit' }));
    await waitFor(() => {
      const profileCall = postMock.mock.calls.find((c) => c[0] === '/users/agency-profile');
      expect(profileCall).toBeDefined();
      expect(profileCall[1]).toMatchObject({
        licenceIssuedAt: new Date('2024-03-15').toISOString(),
        licenceIssuingAuthority: 'Ministère du Tourisme',
      });
    });
  });

  it('locks the issue fields once they are on a verified record (B4)', async () => {
    setProfile({
      ...baseProfile,
      licenceIssuedAt: '2024-03-15T00:00:00.000Z',
      licenceIssuingAuthority: 'Ministère du Tourisme',
    });
    renderPage();
    const issuedAt = (await screen.findByLabelText(
      'onboarding.licence.issuedAtLabel',
    )) as HTMLInputElement;
    expect(issuedAt.disabled).toBe(true);
    expect(issuedAt.value).toBe('2024-03-15');
    expect(screen.queryByText('onboarding.licence.issueDetailsRequired')).toBeNull();
  });

  it('shows the error feedback when the profile update fails', async () => {
    setProfile(baseProfile);
    postMock.mockImplementation((url: string) =>
      url === '/users/agency-profile'
        ? Promise.reject({ response: { data: { message: 'Server refused' } } })
        : Promise.resolve({ data: {} }),
    );
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    renderPage();
    await screen.findByText('onboarding.documents.current licence.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'onboarding.submit' }));
    expect(await screen.findByText('Server refused')).not.toBeNull();
  });

  it('submits the insurance artefact and the certificate key with the profile', async () => {
    setProfile(baseProfile);
    postMock.mockImplementation((url: string) =>
      url === '/upload'
        ? Promise.resolve({ data: { filename: 'private/u1/cert.pdf' } })
        : Promise.resolve({ data: {} }),
    );
    const { container } = renderPage();
    await screen.findByText('onboarding.documents.current licence.pdf');

    fireEvent.change(screen.getByLabelText('onboarding.insurance.insurerLabel'), {
      target: { value: 'AXA Assurance' },
    });
    fireEvent.change(screen.getByLabelText('onboarding.insurance.policyNumberLabel'), {
      target: { value: 'RC-123' },
    });
    fireEvent.change(screen.getByLabelText('onboarding.insurance.insuredNameLabel'), {
      target: { value: 'Atlas Voyages SARL' },
    });
    fireEvent.change(screen.getByLabelText('onboarding.insurance.coverageLimitLabel'), {
      target: { value: '500000' },
    });
    fireEvent.change(screen.getByLabelText('onboarding.insurance.expiryLabel'), {
      target: { value: '2030-06-01' },
    });

    const fileInputs = container.querySelectorAll('input[type="file"]');
    const cert = new File(['cert'], 'cert.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInputs[1], { target: { files: [cert] } });
    await screen.findByText('onboarding.documents.current cert.pdf');

    fireEvent.click(screen.getByRole('button', { name: 'onboarding.submit' }));
    await waitFor(() => {
      const profileCall = postMock.mock.calls.find((c) => c[0] === '/users/agency-profile');
      expect(profileCall).toBeDefined();
      expect(profileCall[1]).toMatchObject({
        licenceDocumentKey: 'private/u1/licence.pdf',
        licenceDocumentName: 'licence.pdf',
        insuranceInsurer: 'AXA Assurance',
        insurancePolicyNumber: 'RC-123',
        insuranceInsuredName: 'Atlas Voyages SARL',
        insuranceCoverageLimit: 500000,
        insuranceCertificateKey: 'private/u1/cert.pdf',
      });
    });
  });
});
