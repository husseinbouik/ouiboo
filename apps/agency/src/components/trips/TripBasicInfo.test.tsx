/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TripBasicInfo } from './TripBasicInfo';
import { useTripWizardForm, type TripWizardFormApi } from './useTripWizardForm';

// Same i18n test double as the other agency suites: t() echoes the key
// plus any interpolation values, so assertions target keys + values.
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

function Harness() {
  const form = useTripWizardForm({
    defaultValues: {
      title: 'Titre français',
      description: 'Description française du voyage',
    },
  });
  formHolder.form = form;
  return <TripBasicInfo t={t as never} form={form} />;
}

describe('TripBasicInfo language tabs (#546)', () => {
  it('renders FR/AR/EN tabs with French active by default, bound to the canonical fields', () => {
    render(<Harness />);

    expect(screen.getByTestId('trip-language-tab-fr')).toBeTruthy();
    expect(screen.getByTestId('trip-language-tab-ar')).toBeTruthy();
    expect(screen.getByTestId('trip-language-tab-en')).toBeTruthy();
    expect(screen.getByTestId('trip-language-tab-fr').getAttribute('aria-selected')).toBe('true');

    // French tab shows the canonical title value.
    const titleInput = screen.getByDisplayValue('Titre français');
    expect(titleInput.getAttribute('dir')).toBe('ltr');
  });

  it('names the missing encouraged languages in the completeness hint', () => {
    render(<Harness />);

    const hint = screen.getByTestId('translations-missing-hint');
    expect(hint.textContent).toContain('trips.create.translationsMissingHint');
    expect(hint.textContent).toContain('trips.create.languageAr');
    expect(hint.textContent).toContain('trips.create.languageEn');
  });

  it('Arabic tab binds translations.ar with RTL inputs; completing it clears it from the hint', () => {
    render(<Harness />);

    fireEvent.click(screen.getByTestId('trip-language-tab-ar'));

    const inputs = document.querySelectorAll('input[dir="rtl"], textarea[dir="rtl"]');
    expect(inputs.length).toBe(2);

    const [titleInput, descriptionInput] = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[dir="rtl"], textarea[dir="rtl"]'),
    );
    fireEvent.change(titleInput, { target: { value: 'عنوان بالعربية' } });
    fireEvent.change(descriptionInput, { target: { value: 'وصف كامل بالعربية' } });

    expect(formHolder.form?.watch('translations')?.ar).toEqual({
      title: 'عنوان بالعربية',
      description: 'وصف كامل بالعربية',
    });

    // Arabic no longer missing; English still is.
    const hint = screen.getByTestId('translations-missing-hint');
    expect(hint.textContent).not.toContain('trips.create.languageAr');
    expect(hint.textContent).toContain('trips.create.languageEn');

    // French canonical values are untouched by the Arabic tab.
    expect(formHolder.form?.watch('title')).toBe('Titre français');
  });
});
