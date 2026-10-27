/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareTripButton } from '@ouiboo/ui';
import { TRAVELER_URL } from '@/lib/site';

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

// Agency shares always point at the public traveler trip URL, tagged with
// the agency-share source. Derived from the same source the component
// uses — CI sets NEXT_PUBLIC_TRAVELER_URL, so no hard-coded default.
const SHARE_URL = `${TRAVELER_URL}/trip/trip-1?src=agency-share`;

describe('ShareTripButton (#468, agency)', () => {
  // Council B12: sharing is gated OFF by default — these suites exercise
  // the enabled path, so they opt in explicitly per test.
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SHARING_ENABLED = 'true';
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share');
    Reflect.deleteProperty(navigator, 'clipboard');
    delete process.env.NEXT_PUBLIC_SHARING_ENABLED;
    jest.restoreAllMocks();
  });

  it('opens the fallback menu with intents for the public traveler URL', async () => {
    const user = userEvent.setup();
    render(<ShareTripButton tripId="trip-1" tripTitle="Sahara Trek" travelerBaseUrl={TRAVELER_URL} source="agency-share" />);

    await user.click(screen.getByRole('button', { name: 'share.button' }));

    const whatsapp = await screen.findByRole('menuitem', { name: 'share.whatsapp' });
    expect(decodeURIComponent(whatsapp.getAttribute('href') ?? '')).toContain(SHARE_URL);
    const facebook = screen.getByRole('menuitem', { name: 'share.facebook' });
    expect(decodeURIComponent(facebook.getAttribute('href') ?? '')).toContain(SHARE_URL);
    expect(screen.getByRole('menuitem', { name: 'share.x' })).not.toBeNull();
    expect(screen.getByRole('menuitem', { name: 'share.telegram' })).not.toBeNull();
    expect(screen.getByRole('menuitem', { name: /share\.copyLink/ })).not.toBeNull();
  });

  it('copies the public URL and shows the copied confirmation', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<ShareTripButton tripId="trip-1" tripTitle="Sahara Trek" travelerBaseUrl={TRAVELER_URL} source="agency-share" />);
    await user.click(screen.getByRole('button', { name: 'share.button' }));
    await user.click(await screen.findByRole('menuitem', { name: /share\.copyLink/ }));

    expect(writeText).toHaveBeenCalledWith(SHARE_URL);
    expect(await screen.findByText('share.copied')).not.toBeNull();
  });

  it('uses the native share sheet when the Web Share API is available', async () => {
    const user = userEvent.setup();
    const share = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });

    render(<ShareTripButton tripId="trip-1" tripTitle="Sahara Trek" travelerBaseUrl={TRAVELER_URL} source="agency-share" />);
    await user.click(screen.getByRole('button', { name: 'share.button' }));

    expect(share).toHaveBeenCalledWith({
      title: 'Sahara Trek',
      text: 'share.text',
      url: SHARE_URL,
    });
  });

  it('renders nothing while the sharing gate is off (Council B12)', () => {
    delete process.env.NEXT_PUBLIC_SHARING_ENABLED;
    const { container } = render(<ShareTripButton tripId="trip-1" tripTitle="Sahara Trek" travelerBaseUrl={TRAVELER_URL} source="agency-share" />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('button', { name: 'share.button' })).toBeNull();
  });
});
