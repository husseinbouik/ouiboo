import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareTripButton from './ShareTripButton';

// The traveler jest setup mocks react-i18next globally (t returns the key),
// so labels below are asserted by translation key.

// jsdom gaps the Radix dropdown relies on.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.HTMLElement.prototype.scrollIntoView = () => {};

const SHARE_URL = 'http://localhost:3001/trip/trip-1?src=share';

describe('ShareTripButton (#468, traveler)', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share');
    Reflect.deleteProperty(navigator, 'clipboard');
    jest.restoreAllMocks();
  });

  it('opens the fallback menu with the four network intents when native share is unavailable', async () => {
    const user = userEvent.setup();
    render(<ShareTripButton tripId="trip-1" tripTitle="Sahara Trek" />);

    await user.click(screen.getByRole('button', { name: 'share.button' }));

    const whatsapp = await screen.findByRole('menuitem', { name: 'share.whatsapp' });
    expect(whatsapp.getAttribute('href')).toContain('https://wa.me/?text=');
    expect(decodeURIComponent(whatsapp.getAttribute('href') ?? '')).toContain(SHARE_URL);
    expect(whatsapp.getAttribute('target')).toBe('_blank');
    expect(whatsapp.getAttribute('rel')).toBe('noopener noreferrer');

    const facebook = screen.getByRole('menuitem', { name: 'share.facebook' });
    expect(facebook.getAttribute('href')).toContain('https://www.facebook.com/sharer/sharer.php?u=');
    expect(decodeURIComponent(facebook.getAttribute('href') ?? '')).toContain(SHARE_URL);

    const x = screen.getByRole('menuitem', { name: 'share.x' });
    expect(x.getAttribute('href')).toContain('https://twitter.com/intent/tweet?');

    const telegram = screen.getByRole('menuitem', { name: 'share.telegram' });
    expect(telegram.getAttribute('href')).toContain('https://t.me/share/url?');

    // Copy-link action is present — no Instagram item (no web intent exists).
    expect(screen.getByRole('menuitem', { name: /share\.copyLink/ })).not.toBeNull();
    expect(screen.queryByText(/instagram/i)).toBeNull();
  });

  it('copies the share URL and shows the copied confirmation', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<ShareTripButton tripId="trip-1" tripTitle="Sahara Trek" />);
    await user.click(screen.getByRole('button', { name: 'share.button' }));
    await user.click(await screen.findByRole('menuitem', { name: /share\.copyLink/ }));

    expect(writeText).toHaveBeenCalledWith(SHARE_URL);
    expect(await screen.findByText('share.copied')).not.toBeNull();
  });

  it('uses the native share sheet when the Web Share API is available', async () => {
    const user = userEvent.setup();
    const share = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });

    render(<ShareTripButton tripId="trip-1" tripTitle="Sahara Trek" />);
    await user.click(screen.getByRole('button', { name: 'share.button' }));

    expect(share).toHaveBeenCalledWith({
      title: 'Sahara Trek',
      text: 'share.text',
      url: SHARE_URL,
    });
  });
});
