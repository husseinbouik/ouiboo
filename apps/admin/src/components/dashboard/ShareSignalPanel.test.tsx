/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ShareSignalPanel from './ShareSignalPanel';

const t = (key: string) => key;

describe('ShareSignalPanel (#561 rework)', () => {
  it('renders the sharing state even when the verification queue is empty', () => {
    render(<ShareSignalPanel t={t} trips={[]} />);
    expect(screen.getByTestId('share-signal-panel')).not.toBeNull();
    expect(screen.getByText('dashboard.sharePreview.panelEmpty')).not.toBeNull();
    // Admin sharing is off in the test env: the gated label must show.
    expect(screen.getByText('dashboard.sharePreview.panelGated')).not.toBeNull();
    expect(screen.getByText('dashboard.sharePreview.panelAdminNote')).not.toBeNull();
  });

  it('expands the per-trip OG preview for a queued trip', () => {
    render(
      <ShareSignalPanel
        t={t}
        trips={[{ id: 'trip-1', title: 'Atlas Trek', images: [], description: 'A trek.' }]}
      />,
    );
    fireEvent.click(screen.getByText('Atlas Trek'));
    expect(screen.getByTestId('share-preview-card')).not.toBeNull();
  });
});
