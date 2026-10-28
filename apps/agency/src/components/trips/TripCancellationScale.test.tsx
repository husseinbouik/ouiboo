/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TripCancellationScale } from './TripCancellationScale';
import { useTripWizardForm } from './useTripWizardForm';

// Same i18n test double as the other agency suites: t() echoes the key
// plus any interpolation values, so assertions target keys + numbers.
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

function Harness() {
  const form = useTripWizardForm();
  return <TripCancellationScale t={t as never} form={form} />;
}

const numberInputs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLInputElement>('input[type="number"]'));

describe('TripCancellationScale (#417)', () => {
  it('shows the platform default bands read-only while the trip is not customized', () => {
    const { container } = render(<Harness />);

    expect(screen.getByText('trips.create.cancellationTitle')).toBeTruthy();
    expect(screen.getByText('trips.create.cancellationFloorNote')).toBeTruthy();
    expect(screen.getByText('trips.create.cancellationDefaultNote')).toBeTruthy();
    // Default scale: 4 "at least" lines (30/15/7/3 days) + 1 closing line.
    expect(screen.getAllByText(/cancellationBandAtLeast/)).toHaveLength(4);
    expect(screen.getAllByText(/cancellationBandLessThan/)).toHaveLength(1);
    expect(screen.getByText(/cancellationBandAtLeast 30 100/)).toBeTruthy();
    // No editable band inputs until the agency customizes.
    expect(numberInputs(container)).toHaveLength(0);
  });

  it('customize copies the defaults into editable bands; reset returns to the defaults', () => {
    const { container } = render(<Harness />);

    fireEvent.click(screen.getByText('trips.create.cancellationCustomize'));

    // 5 default bands x (days + percent) inputs, first band = 30d / 100%.
    const inputs = numberInputs(container);
    expect(inputs).toHaveLength(10);
    expect(inputs[0].value).toBe('30');
    expect(inputs[1].value).toBe('100');

    fireEvent.click(screen.getByText('trips.create.cancellationReset'));
    expect(numberInputs(container)).toHaveLength(0);
    expect(screen.getByText('trips.create.cancellationDefaultNote')).toBeTruthy();
  });

  it('add band appends a row and removing every band returns to the platform defaults', () => {
    const { container } = render(<Harness />);

    fireEvent.click(screen.getByText('trips.create.cancellationCustomize'));
    fireEvent.click(screen.getByText(/cancellationAddBand/));
    expect(numberInputs(container)).toHaveLength(12);

    // Remove bands one by one; the last removal clears the policy.
    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(screen.getAllByLabelText('trips.create.cancellationRemoveBand')[0]);
    }
    expect(numberInputs(container)).toHaveLength(0);
    expect(screen.getByText('trips.create.cancellationDefaultNote')).toBeTruthy();
  });
});
