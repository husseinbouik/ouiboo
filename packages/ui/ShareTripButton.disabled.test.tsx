import React from 'react';
import { render, screen } from '@testing-library/react';
import { ShareTripButton } from './ShareTripButton';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const BASE = 'https://traveler.example.com';

describe('ShareTripButton disabled state (#561)', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SHARING_ENABLED;
  });

  it('renders a disabled affordance with opens-at-launch copy when opted in and the gate is off', () => {
    delete process.env.NEXT_PUBLIC_SHARING_ENABLED;
    render(
      <ShareTripButton tripId="trip-1" tripTitle="Sahara Trek" travelerBaseUrl={BASE} showDisabledWhenOff />,
    );
    const button = screen.getByRole('button', { name: 'share.opensAtLaunch' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText('share.opensAtLaunch')).not.toBeNull();
  });

  it('renders a disabled icon button in icon-only mode', () => {
    delete process.env.NEXT_PUBLIC_SHARING_ENABLED;
    render(
      <ShareTripButton tripId="trip-1" tripTitle="Sahara Trek" travelerBaseUrl={BASE} showDisabledWhenOff iconOnly />,
    );
    const button = screen.getByRole('button', { name: 'share.opensAtLaunch' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('still renders the live share button when the gate is on', () => {
    process.env.NEXT_PUBLIC_SHARING_ENABLED = 'true';
    render(
      <ShareTripButton tripId="trip-1" tripTitle="Sahara Trek" travelerBaseUrl={BASE} showDisabledWhenOff />,
    );
    expect(screen.getByRole('button', { name: 'share.button' })).not.toBeNull();
    expect(screen.queryByText('share.opensAtLaunch')).toBeNull();
  });
});
