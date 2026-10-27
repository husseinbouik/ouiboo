/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://traveler.example.com/"}
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareTripButton } from './ShareTripButton';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// jsdom gaps the Radix dropdown relies on.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.HTMLElement.prototype.scrollIntoView = () => {};

/**
 * #468 localhost guard, exercised the way a deployed build runs: this
 * suite's jsdom page origin is a public deployed origin (see the docblock
 * above), while the configured share base passed in is the loopback
 * default both apps ship when NEXT_PUBLIC_TRAVELER_URL is missing. A
 * deployed build must never turn that into a shared link. (jsdom's
 * location.origin is non-configurable, so the origin is set via the
 * environment URL instead of a property stub.)
 */
describe('ShareTripButton on a deployed origin (#468)', () => {
  // Council B12: sharing is gated OFF by default \u2014 opt in explicitly.
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SHARING_ENABLED = 'true';
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share');
    Reflect.deleteProperty(navigator, 'clipboard');
    delete process.env.NEXT_PUBLIC_SHARING_ENABLED;
    jest.restoreAllMocks();
  });

  it('uses the deployed page origin instead of the loopback configured base (traveller app)', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(
      <ShareTripButton
        tripId="trip-1"
        tripTitle="Sahara Trek"
        travelerBaseUrl="http://localhost:3001"
        allowRuntimeOriginFallback
      />,
    );
    await user.click(screen.getByRole('button', { name: 'share.button' }));
    await user.click(await screen.findByRole('menuitem', { name: /share\.copyLink/ }));

    expect(writeText).toHaveBeenCalledWith('https://traveler.example.com/trip/trip-1?src=share');
  });

  it('renders nothing when only a loopback base is configured and runtime fallback is off (agency app)', () => {
    const { container } = render(
      <ShareTripButton tripId="trip-1" tripTitle="Sahara Trek" travelerBaseUrl="http://localhost:3001" />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('button', { name: 'share.button' })).toBeNull();
  });
});
