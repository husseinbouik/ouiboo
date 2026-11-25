import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

/**
 * #1029 (D4): tones come from the single `@ouiboo/utils` registry.
 * These pins cover the reconciled readings — most importantly that an
 * ACCEPTED proof is a warning, never a success (#422).
 */
describe('StatusBadge (registry-driven tones)', () => {
  it('renders a confirmed booking with the success tone', () => {
    render(<StatusBadge status="CONFIRMED" domain="booking" />);
    const badge = screen.getByText('Confirmed').parentElement;
    expect(badge?.className).toContain('emerald');
    expect(badge?.getAttribute('data-status')).toBe('CONFIRMED');
  });

  it('renders an accepted proof with the warning tone, not success', () => {
    render(<StatusBadge status="ACCEPTED" domain="verification" />);
    const badge = screen.getByText('Accepted').parentElement;
    expect(badge?.className).toContain('amber');
  });

  it('renders an expired licence with the danger tone (extended domains)', () => {
    render(<StatusBadge status="EXPIRED" domain="licence" />);
    const badge = screen.getByText('Expired').parentElement;
    expect(badge?.className).toContain('red');
  });

  it('prefers an explicit per-audience label over the humanised status', () => {
    render(<StatusBadge status="PENDING" domain="payment" label="Deposit due" />);
    expect(screen.getByText('Deposit due')).toBeTruthy();
  });

  it('falls back to the neutral tone for unknown statuses', () => {
    render(<StatusBadge status="SOMETHING_NEW" domain="booking" />);
    const badge = screen.getByText('Something New').parentElement;
    expect(badge?.className).toContain('slate');
  });
});
