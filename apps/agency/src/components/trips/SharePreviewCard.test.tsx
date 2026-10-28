/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SharePreviewCard } from './SharePreviewCard';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      key === 'share.text' ? 'Check out this trip on Ouiboo: {{title}}' : key,
  }),
}));

const trip = {
  id: 'trip-1',
  title: 'Sahara Guaranteed Trek',
  description: 'A verified desert journey.',
  images: ['https://example.com/cover.jpg'],
};

describe('SharePreviewCard (#561)', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SHARING_ENABLED;
  });

  it('previews the OG card with claim words scrubbed and the canonical share URL', () => {
    delete process.env.NEXT_PUBLIC_SHARING_ENABLED;
    render(<SharePreviewCard trip={trip} />);
    // 'Guaranteed' / 'verified' are claim words — scrubbed exactly like
    // the traveller metadata scrubs them.
    expect(screen.getByText('Sahara Trek')).not.toBeNull();
    expect(screen.getByText('A desert journey.')).not.toBeNull();
    expect(screen.getByText(/src=agency-share/)).not.toBeNull();
    expect(screen.getByText('Check out this trip on Ouiboo: Sahara Trek')).not.toBeNull();
  });

  it('labels the preview as gated while sharing is off, and live when on', () => {
    delete process.env.NEXT_PUBLIC_SHARING_ENABLED;
    const { rerender } = render(<SharePreviewCard trip={trip} />);
    expect(screen.getByText('sharePreview.gatedNote')).not.toBeNull();
    process.env.NEXT_PUBLIC_SHARING_ENABLED = 'true';
    rerender(<SharePreviewCard trip={trip} />);
    expect(screen.getByText('sharePreview.liveNote')).not.toBeNull();
  });
});
