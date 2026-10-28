/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { VerificationPausedBanner } from './VerificationPausedBanner';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('./AuthContext', () => ({
  useAuth: () => ({ user: (globalThis as Record<string, unknown>).__mockUser ?? null }),
}));

const setProfile = (profile: Record<string, unknown> | null) => {
  (globalThis as Record<string, unknown>).__mockUser = profile
    ? { id: 'u1', role: 'AGENCY', agencyProfile: profile }
    : null;
};

const healthy = {
  travelLicenceStatus: 'VERIFIED',
  licenceExpiry: '2030-01-01T00:00:00.000Z',
  insuranceStatus: 'VERIFIED',
  insuranceExpiry: '2030-01-01T00:00:00.000Z',
  verificationPausedAt: null,
  verificationPauseReason: null,
};

describe('VerificationPausedBanner (#415)', () => {
  afterEach(() => {
    setProfile(null);
  });

  it('renders nothing without a profile or when fully verified', () => {
    setProfile(null);
    const { container, rerender } = render(<VerificationPausedBanner />);
    expect(container.firstChild).toBeNull();
    setProfile(healthy);
    rerender(<VerificationPausedBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the pause, the stored reason and the renewal CTA when the sweep paused the agency', () => {
    setProfile({
      ...healthy,
      travelLicenceStatus: 'EXPIRED',
      licenceExpiry: '2026-01-01T00:00:00.000Z',
      verificationPausedAt: '2026-10-25T02:00:00.000Z',
      verificationPauseReason: 'Travel licence expired on 2026-01-01',
    });
    render(<VerificationPausedBanner />);
    expect(screen.getByText('verificationPaused.title')).not.toBeNull();
    expect(screen.getByText(/verificationPaused.licenceExpired/)).not.toBeNull();
    expect(screen.getByText('Travel licence expired on 2026-01-01')).not.toBeNull();
    const cta = screen.getByRole('link', { name: 'verificationPaused.cta' });
    expect(cta.getAttribute('href')).toBe('/dashboard/onboarding');
  });

  it('derives the pause from an expired insurance even without the sweep stamp, and hides the CTA on request', () => {
    setProfile({
      ...healthy,
      insuranceStatus: 'VERIFIED',
      insuranceExpiry: '2026-01-01T00:00:00.000Z',
    });
    render(<VerificationPausedBanner showCta={false} />);
    expect(screen.getByText(/verificationPaused.insuranceExpired/)).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'verificationPaused.cta' })).toBeNull();
  });
});
