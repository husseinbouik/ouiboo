/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CrmPipeline } from './CrmPipeline';
import type { CrmPipeline as CrmPipelineData } from '@/lib/crm';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts?.count !== undefined ? `${key} ${String(opts.count)}` : key,
    i18n: { language: 'en' },
  }),
}));

const pipeline: CrmPipelineData = {
  stages: [
    { status: 'PENDING', count: 2, totalAmount: '300.00', currency: 'MAD' },
    { status: 'CONFIRMED', count: 1, totalAmount: '2000.00', currency: 'MAD' },
    { status: 'CANCELLED', count: 1, totalAmount: '900.00', currency: 'MAD' },
  ],
  totals: { bookings: 4, bookedValue: '2300.00', currency: 'MAD' },
  refundCases: { open: 1, total: 2 },
};

describe('CrmPipeline (#786)', () => {
  it('renders every stage with its count and amount, plus totals and refund cases', () => {
    render(<CrmPipeline pipeline={pipeline} selectedStatus={null} onSelect={() => {}} />);

    expect(screen.getByRole('button', { name: /status\.bookingPending/ })).not.toBeNull();
    expect(screen.getByRole('button', { name: /status\.bookingConfirmed/ })).not.toBeNull();
    expect(screen.getByRole('button', { name: /status\.bookingCancelled/ })).not.toBeNull();
    expect(screen.getAllByText(/2,300/).length).toBeGreaterThan(0);
    expect(screen.getByText(/2,000/)).not.toBeNull();
    expect(screen.getByText(/crm\.refundCases/)).not.toBeNull();
  });

  it('selects a stage on click and clears it on a second click', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <CrmPipeline pipeline={pipeline} selectedStatus={null} onSelect={onSelect} />,
    );

    await user.click(screen.getByRole('button', { name: /status\.bookingConfirmed/ }));
    expect(onSelect).toHaveBeenCalledWith('CONFIRMED');

    rerender(<CrmPipeline pipeline={pipeline} selectedStatus="CONFIRMED" onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /status\.bookingConfirmed/ }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('marks the selected stage with aria-pressed', () => {
    render(<CrmPipeline pipeline={pipeline} selectedStatus="PENDING" onSelect={() => {}} />);
    expect(
      screen.getByRole('button', { name: /status\.bookingPending/ }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen.getByRole('button', { name: /crm\.allStages/ }).getAttribute('aria-pressed'),
    ).toBe('false');
  });
});
