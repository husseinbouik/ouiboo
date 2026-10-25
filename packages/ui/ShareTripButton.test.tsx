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

const BASE = 'https://traveler.example.com';
const SHARE_URL = `${BASE}/trip/trip-1?src=share`;

describe('ShareTripButton (#468, @ouiboo/ui)', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share');
    Reflect.deleteProperty(navigator, 'clipboard');
    jest.restoreAllMocks();
  });

  it('opens the fallback menu with the four network intents when native share is unavailable', async () => {
    const user = userEvent.setup();
    render(<ShareTripButton tripId="trip-1" tripTitle="Sahara Trek" travelerBaseUrl={BASE} />);

    await user.click(screen.getByRole('button', { name: 'share.button' }));

    const whatsapp = await screen.findByRole('menuitem', { name: 'share.whatsapp' });
    expect(whatsapp.getAttribute('href')).toContain('https://wa.me/?text=');
    expect(decodeURIComponent(whatsapp.getAttribute('href') ?? '')).toContain(SHARE_URL);
    expect(whatsapp.getAttribute('target')).toBe('_blank');
    expect(whatsapp.getAttribute('rel')).toBe('noopener noreferrer');

    const facebook = screen.getByRole('menuitem', { name: 'share.facebook' });
    expect(decodeURIComponent(facebook.getAttribute('href') ?? '')).toContain(SHARE_URL);
    expect(screen.getByRole('menuitem', { name: 'share.x' })).not.toBeNull();
    expect(screen.getByRole('menuitem', { name: 'share.telegram' })).not.toBeNull();

    // Copy-link action is present — no Instagram item (no web intent exists).
    expect(screen.getByRole('menuitem', { name: /share\.copyLink/ })).not.toBeNull();
    expect(screen.queryByText(/instagram/i)).toBeNull();
  });

  it('tags the shared URL with the given source', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(
      <ShareTripButton
        tripId="trip-1"
        tripTitle="Sahara Trek"
        travelerBaseUrl={BASE}
        source="agency-share"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'share.button' }));
    await user.click(await screen.findByRole('menuitem', { name: /share\.copyLink/ }));

    expect(writeText).toHaveBeenCalledWith(`${BASE}/trip/trip-1?src=agency-share`);
    expect(await screen.findByText('share.copied')).not.toBeNull();
  });

  it('copies the share URL and shows the copied confirmation', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<ShareTripButton tripId="trip-1" tripTitle="Sahara Trek" travelerBaseUrl={BASE} />);
    await user.click(screen.getByRole('button', { name: 'share.button' }));
    await user.click(await screen.findByRole('menuitem', { name: /share\.copyLink/ }));

    expect(writeText).toHaveBeenCalledWith(SHARE_URL);
    expect(await screen.findByText('share.copied')).not.toBeNull();
  });

  it('uses the native share sheet when the Web Share API is available', async () => {
    const user = userEvent.setup();
    const share = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });

    render(<ShareTripButton tripId="trip-1" tripTitle="Sahara Trek" travelerBaseUrl={BASE} />);
    await user.click(screen.getByRole('button', { name: 'share.button' }));

    expect(share).toHaveBeenCalledWith({
      title: 'Sahara Trek',
      text: 'share.text',
      url: SHARE_URL,
    });
  });

  it('renders an icon-only variant with an accessible label', () => {
    render(
      <ShareTripButton tripId="trip-1" tripTitle="Sahara Trek" travelerBaseUrl={BASE} iconOnly />,
    );
    const button = screen.getByRole('button', { name: 'share.button' });
    expect(button.textContent).toBe('');
  });
});
