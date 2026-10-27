/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { TripLivePreview } from './TripLivePreview';
import type { TripWizardFormApi } from './useTripWizardForm';

const t = ((key: string) => key) as unknown as TFunction;

function makeForm(values: Record<string, unknown>): TripWizardFormApi {
  return {
    watch: (name: string) => values[name],
    watchedImages: (values.images as string[]) || [],
    watchedImageAlts: [],
  } as unknown as TripWizardFormApi;
}

describe('TripLivePreview (#578)', () => {
  it('shows an explicit empty state when nothing has been entered', () => {
    render(<TripLivePreview t={t} form={makeForm({})} mode="create" />);
    expect(screen.getByTestId('live-preview-empty')).not.toBeNull();
    expect(screen.getByText('trips.create.livePreviewEmptyTitle')).not.toBeNull();
    // Placeholder fallbacks must not be styled as content any more.
    expect(screen.queryByText('trips.create.untitledAdventure')).toBeNull();
  });

  it('shows the content card once a title exists', () => {
    render(<TripLivePreview t={t} form={makeForm({ title: 'Sahara Trek', category: 'ADVENTURE', durationDays: 3, durationNights: 2 })} mode="create" />);
    expect(screen.queryByTestId('live-preview-empty')).toBeNull();
    expect(screen.getByText('Sahara Trek')).not.toBeNull();
  });
});
