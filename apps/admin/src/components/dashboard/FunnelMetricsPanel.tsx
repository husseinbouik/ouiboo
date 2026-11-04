'use client';

import React from 'react';
import { Card, CardContent } from '@ouiboo/ui';
import type { AdminFunnelMetrics } from './types';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type FunnelMetricsPanelProps = {
  t: TFn;
  metrics: AdminFunnelMetrics | null | undefined;
  isLoading?: boolean;
  isError?: boolean;
};

function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}%`;
}

/**
 * #756: admin consumer for the funnel readout
 * (GET /admin/analytics/funnel). Aggregate server facts only — the
 * panel renders counts and conversions exactly as the service derives
 * them; steps the server cannot observe (detail views, checkout
 * starts) are not shown rather than estimated. Taxonomy + privacy
 * contract: docs/funnel-measurement.md.
 */
export default function FunnelMetricsPanel({ t, metrics, isLoading = false, isError = false }: FunnelMetricsPanelProps) {
  const complete = Boolean(metrics && metrics.steps && metrics.conversions && metrics.refunds);
  const showError = isError || Boolean(metrics && !complete);
  const show = complete ? metrics : null;

  const rows: Array<{ label: string; value: string }> = show
    ? [
        { label: t('dashboard.funnel.searches'), value: String(show.steps.searches) },
        { label: t('dashboard.funnel.zeroResultRate'), value: formatPercent(show.conversions.zeroResultRatePercent) },
        { label: t('dashboard.funnel.bookingsCreated'), value: String(show.steps.bookingsCreated) },
        { label: t('dashboard.funnel.bookingPerSearch'), value: formatPercent(show.conversions.bookingPerSearchPercent) },
        { label: t('dashboard.funnel.proofsSubmitted'), value: String(show.steps.proofsSubmitted) },
        { label: t('dashboard.funnel.proofsPending'), value: String(show.steps.proofsPending) },
        { label: t('dashboard.funnel.bankConfirmed'), value: String(show.steps.bankConfirmedBookings) },
        { label: t('dashboard.funnel.confirmed'), value: String(show.steps.confirmedBookings) },
        { label: t('dashboard.funnel.completed'), value: String(show.steps.completedBookings) },
        { label: t('dashboard.funnel.cancelled'), value: String(show.steps.cancelledBookings) },
        { label: t('dashboard.funnel.refundCases'), value: String(show.refunds.total) },
      ]
    : [];

  return (
    <section aria-label={t('dashboard.funnel.title')} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t('dashboard.funnel.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('dashboard.funnel.subtitle')}</p>
        {show?.window && (
          <p className="text-xs text-muted-foreground">
            {t('dashboard.funnel.window', {
              from: new Date(show.window.from).toLocaleDateString(),
              to: new Date(show.window.to).toLocaleDateString(),
            })}
          </p>
        )}
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">{t('dashboard.funnel.loading')}</p>}
      {showError && <p className="text-sm text-rose-600">{t('dashboard.funnel.error')}</p>}
      {show && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {rows.map((row) => (
            <Card key={row.label}>
              <CardContent className="p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{row.label}</p>
                <p className="mt-1 text-2xl font-black">{row.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
