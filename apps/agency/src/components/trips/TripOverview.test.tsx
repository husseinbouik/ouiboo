/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TripStatus } from '@ouiboo/types';
import { TripOverview } from './TripOverview';
import type { TripDetail } from './trip-detail-types';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/components/AuthContext', () => ({
  useAuth: () => ({
    user: (globalThis as Record<string, unknown>).__mockUser ?? null,
  }),
}));

const trip: TripDetail = {
  id: 'trip-1',
  title: 'Sahara Trek',
  category: 'Adventure',
  status: TripStatus.Active,
  currency: 'MAD',
  startLocation: 'Merzouga',
  durationDays: 3,
  durationNights: 2,
  description: 'Three days in the dunes.',
  images: [],
  imageAlts: [],
};

const setProfile = (agencyProfile: Record<string, unknown>) => {
  (globalThis as Record<string, unknown>).__mockUser = {
    id: 'u1',
    agencyProfile,
  };
};

const fullyVerified = {
  verificationStatus: 'VERIFIED',
  travelLicenceStatus: 'VERIFIED',
  licenceExpiry: '2030-01-01T00:00:00.000Z',
  insuranceStatus: 'VERIFIED',
  insuranceExpiry: '2030-01-01T00:00:00.000Z',
};

describe('TripOverview verification banner (#415)', () => {
  afterEach(() => {
    (globalThis as Record<string, unknown>).__mockUser = null;
  });

  it('renders no banner for a fully verified agency, even on a live trip', () => {
    setProfile(fullyVerified);
    render(<TripOverview trip={trip} />);
    expect(screen.queryByText('trips.detail.verificationRequired')).toBeNull();
  });

  it('names RC insurance when it is the blocking artefact', () => {
    setProfile({ ...fullyVerified, insuranceStatus: 'NOT_SUBMITTED', insuranceExpiry: null });
    render(<TripOverview trip={trip} />);
    expect(screen.getByText('trips.detail.verificationRequired')).not.toBeNull();
    expect(screen.getByText(/onboarding\.insurance\.status\.NOT_SUBMITTED/)).not.toBeNull();
    expect(screen.getByText(/trips\.detail\.activationBlockedBody/)).not.toBeNull();
    expect(
      screen.getByRole('link', { name: 'trips.detail.checkVerificationStatus' }),
    ).not.toBeNull();
  });

  it('names the identity step when identity verification is incomplete', () => {
    setProfile({ ...fullyVerified, verificationStatus: 'PENDING' });
    render(<TripOverview trip={trip} />);
    expect(screen.getByText(/verification\.block\.identity/)).not.toBeNull();
  });

  it('names an expired licence via the derived effective status', () => {
    setProfile({ ...fullyVerified, licenceExpiry: '2020-01-01T00:00:00.000Z' });
    render(<TripOverview trip={trip} />);
    expect(screen.getByText(/onboarding\.licence\.status\.EXPIRED/)).not.toBeNull();
  });
});
