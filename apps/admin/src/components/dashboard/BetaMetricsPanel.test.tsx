/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import BetaMetricsPanel from './BetaMetricsPanel';
import type { AdminBetaMetrics } from './types';

const t = (key: string, opts?: Record<string, unknown>) =>
  opts ? `${key}:${JSON.stringify(opts)}` : key;

const metrics: AdminBetaMetrics = {
  window: { from: '2026-09-27T00:00:00.000Z', to: '2026-10-27T00:00:00.000Z' },
  generatedAt: '2026-10-27T12:00:00.000Z',
  searches: { total: 100, zeroResult: 10, zeroResultRate: 10 },
  bookings: { created: 40, byStatus: {}, completed: 5 },
  refunds: {
    opened: 3,
    byStatus: {},
    completed: 1,
    sla: { initiated: 2, initiatedWithin7d: 2, percentWithin7d: 100 },
    overdueNow: 1,
    proofToBankConfirmationLagHours: { samples: 0, median: null, average: null },
  },
  disputes: { opened: 0, per1000Bookings: 0 },
  stuck: { bookingsAwaitingValidationOver48h: 0, refundCasesPastDueOver48h: 1, total: 1 },
  duplicates: { duplicateBookings: 0, rate: 0 },
  terms: { nullTermsInWindow: 0, recordedRate: 100, nullTermsAllTime: 0 },
  sweepPauses: { agenciesCurrentlyPaused: 0, note: 'Point-in-time count. Historical pause events are not derivable.' },
  interventions: { count: 0, per100Bookings: 0 },
  support: { responseWithin48hPercent: null, derivable: false, reason: 'No ticket timestamps are stored.' },
  exitCriteria: [
    { key: 'zeroResultRate', target: '<= 20% of searches return zero results', value: 10, pass: true },
    { key: 'termsRecorded', target: 'terms recorded on 100% of new bookings', value: null, pass: null },
  ],
};

describe('BetaMetricsPanel (#559)', () => {
  it('renders the service metrics and exit criteria as reported', () => {
    render(<BetaMetricsPanel t={t} metrics={metrics} />);
    expect(screen.getByText('10%')).not.toBeNull();
    expect(screen.getByText(/zeroResultRate/)).not.toBeNull();
    expect(screen.getByText(/<= 20% of searches/)).not.toBeNull();
  });

  it('keeps the not-derivable honesty: reason is shown, never a made-up value', () => {
    render(<BetaMetricsPanel t={t} metrics={metrics} />);
    const block = screen.getByTestId('beta-metrics-not-derivable');
    expect(block.textContent).toContain('No ticket timestamps are stored.');
    expect(screen.getByText(/Historical pause events are not derivable/)).not.toBeNull();
  });

  it('renders a null criterion as no-data rather than pass or fail', () => {
    render(<BetaMetricsPanel t={t} metrics={metrics} />);
    expect(screen.getByText(/terms recorded on 100%/).parentElement?.textContent).toContain('dashboard.betaMetrics.noData');
  });

  it('shows loading and error states without inventing numbers', () => {
    const { rerender } = render(<BetaMetricsPanel t={t} metrics={null} isLoading />);
    expect(screen.getByText('dashboard.betaMetrics.loading')).not.toBeNull();
    rerender(<BetaMetricsPanel t={t} metrics={null} isError />);
    expect(screen.getByText('dashboard.betaMetrics.error')).not.toBeNull();
  });
});
