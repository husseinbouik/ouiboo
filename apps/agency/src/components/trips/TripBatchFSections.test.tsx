/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TripBatchFSections } from './TripBatchFSections';
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

function Harness() {
  const form = useTripWizardForm({ defaultValues: {} });
  formHolder.form = form;
  return <TripBatchFSections t={t as never} form={form} />;
}

describe('TripBatchFSections (Batch F editor)', () => {
  it('renders the payment elections, pickup points and FAQ sections', () => {
    render(<Harness />);
    expect(screen.getByText('batchF.electionsTitle')).toBeTruthy();
    expect(screen.getByText('batchF.payOnArrivalToggle')).toBeTruthy();
    expect(screen.getByText('batchF.privateTourToggle')).toBeTruthy();
    expect(screen.getByText('batchF.pickupTitle')).toBeTruthy();
    expect(screen.getByText('batchF.faqTitle')).toBeTruthy();
  });

  it('adds a pickup point and an FAQ entry into the form values', () => {
    render(<Harness />);

    fireEvent.click(screen.getByText(/batchF.pickupAdd/));
    const pickups = formHolder.form!.watch('pickupPoints') ?? [];
    expect(pickups).toHaveLength(1);
    expect(pickups[0].id).toMatch(/^pp-/);

    fireEvent.click(screen.getByText(/batchF.faqAdd/));
    const faqs = formHolder.form!.watch('faqs') ?? [];
    expect(faqs).toHaveLength(1);
  });

  it('caps FAQs at 5 entries (no add button beyond the cap)', () => {
    render(<Harness />);
    for (let i = 0; i < 5; i += 1) {
      fireEvent.click(screen.getByText(/batchF.faqAdd/));
    }
    expect(formHolder.form!.watch('faqs')).toHaveLength(5);
    expect(screen.queryByText(/batchF.faqAdd/)).toBeNull();
  });
});
