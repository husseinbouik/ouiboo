/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TripItinerary } from './TripItinerary';
import { TripExtras } from './TripExtras';
import { useTripWizardForm, type TripWizardFormApi } from './useTripWizardForm';

// Same i18n test double as the other agency suites: t() echoes the key.
const t = (key: string, opts?: Record<string, unknown>) => {
  let out = key;
  if (opts) {
    for (const v of Object.values(opts)) out += ` ${String(v)}`;
  }
  return out;
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t }),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() },
}));

const formHolder: { form: TripWizardFormApi | null } = { form: null };

function ItineraryHarness() {
  const form = useTripWizardForm({
    defaultValues: {
      itinerary: [{ dayNumber: 1, title: 'Arrivée', description: 'Accueil', activities: [] }],
    },
  });
  formHolder.form = form;
  return <TripItinerary t={t as never} form={form} />;
}

function ExtrasHarness() {
  const form = useTripWizardForm({
    defaultValues: { inclusions: ['Guide local'], exclusions: [], checklist: [] },
  });
  formHolder.form = form;
  return <TripExtras t={t as never} form={form} mode="create" />;
}

describe('phase-2 section language tabs (#584)', () => {
  it('itinerary: French binds the canonical day fields; Arabic binds translations.ar.itinerary', () => {
    render(<ItineraryHarness />);
    expect(screen.getByTestId('itinerary-language-tab-fr').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByDisplayValue('Arrivée')).toBeTruthy();

    fireEvent.click(screen.getByTestId('itinerary-language-tab-ar'));
    const arTitle = document.querySelector('input[name="translations.ar.itinerary.0.title"]') as HTMLInputElement;
    expect(arTitle).toBeTruthy();
    expect(arTitle.getAttribute('dir')).toBe('rtl');
    fireEvent.change(arTitle, { target: { value: 'الوصول' } });
    expect(formHolder.form?.watch('translations')?.ar?.itinerary?.[0]?.title).toBe('الوصول');
    // The canonical French day is untouched.
    expect(formHolder.form?.watch('itinerary')?.[0]?.title).toBe('Arrivée');
  });

  it('extras: Arabic list edits land in translations.ar, canonical list untouched', () => {
    render(<ExtrasHarness />);
    expect(screen.getByDisplayValue('Guide local')).toBeTruthy();

    fireEvent.click(screen.getByTestId('extras-language-tab-ar'));
    // No Arabic items yet — add one via the inclusions card's add button.
    fireEvent.click(screen.getByText('trips.create.addIncluded'));
    const input = document.querySelector('input[placeholder="Guide local"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'دليل محلي' } });
    expect(formHolder.form?.watch('translations')?.ar?.inclusions).toEqual(['دليل محلي']);
    expect(formHolder.form?.watch('inclusions')).toEqual(['Guide local']);
  });
});
