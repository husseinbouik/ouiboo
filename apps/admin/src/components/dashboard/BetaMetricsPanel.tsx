'use client';

import React from 'react';
import { Card, CardContent } from '@ouiboo/ui';
import type { AdminBetaMetrics } from './types';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type BetaMetricsPanelProps = {
  t: TFn;
  metrics: AdminBetaMetrics | null | undefined;
  isLoading?: boolean;
  isError?: boolean;
};

function formatValue(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : String(value);
}

function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}%`;
}

/**
 * #559 (Council S3 P1-1): admin consumer for the #432 beta-metrics service
 * (GET /admin/analytics/beta-metrics). The panel renders the service
 * output as-is: metrics the service marks not derivable keep their
 * `derivable: false` + reason, null values render as "no data", and exit
 * criteria show pass / fail / not-enough-data exactly as reported. No
 * number is estimated or substituted here.
 */
export default function BetaMetricsPanel({ t, metrics, isLoading = false, isError = false }: BetaMetricsPanelProps) {
  // Defensive: a malformed/partial payload is shown as unavailable —
  // never rendered as partial numbers and never allowed to crash the page.
  const complete = Boolean(
    metrics &&
      metrics.searches &&
      metrics.bookings &&
      metrics.refunds &&
      metrics.disputes &&
      metrics.stuck &&
      metrics.duplicates &&
      metrics.terms &&
      Array.isArray(metrics.exitCriteria),
  );
  const showError = isError || Boolean(metrics && !complete);
  const showMetrics = complete ? metrics : null;
  return (
    <section aria-label={t('dashboard.betaMetrics.title')} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t('dashboard.betaMetrics.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('dashboard.betaMetrics.subtitle')}</p>
        {showMetrics?.window && (
          <p className="text-xs text-muted-foreground">
            {t('dashboard.betaMetrics.window', {
              from: new Date(showMetrics.window.from).toLocaleDateString(),
              to: new Date(showMetrics.window.to).toLocaleDateString(),
            })}
          </p>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{t('dashboard.betaMetrics.loading')}</p>}
      {showError && <p className="text-sm text-danger">{t('dashboard.betaMetrics.error')}</p>}

      {showMetrics && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card className="border-none shadow-sm rounded-2xl">
              <CardContent className="p-5 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('dashboard.betaMetrics.zeroResultRate')}</p>
                <p className="text-2xl font-black text-foreground">{formatPercent(showMetrics.searches.zeroResultRate)}</p>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.betaMetrics.searchesDetail', { zero: showMetrics.searches.zeroResult, total: showMetrics.searches.total })}
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl">
              <CardContent className="p-5 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('dashboard.betaMetrics.bookingsCreated')}</p>
                <p className="text-2xl font-black text-foreground">{formatValue(showMetrics.bookings.created)}</p>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.betaMetrics.bookingsCompleted', { count: showMetrics.bookings.completed })}
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl">
              <CardContent className="p-5 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('dashboard.betaMetrics.refundSla')}</p>
                <p className="text-2xl font-black text-foreground">{formatPercent(showMetrics.refunds.sla.percentWithin7d)}</p>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.betaMetrics.refundsOpened', { count: showMetrics.refunds.opened })}
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl">
              <CardContent className="p-5 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('dashboard.betaMetrics.disputesPer1000')}</p>
                <p className="text-2xl font-black text-foreground">{formatValue(showMetrics.disputes.per1000Bookings)}</p>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.betaMetrics.disputesOpened', { count: showMetrics.disputes.opened })}
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl">
              <CardContent className="p-5 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('dashboard.betaMetrics.stuckTotal')}</p>
                <p className="text-2xl font-black text-foreground">{formatValue(showMetrics.stuck.total)}</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.betaMetrics.stuckHint')}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl">
              <CardContent className="p-5 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('dashboard.betaMetrics.termsRecorded')}</p>
                <p className="text-2xl font-black text-foreground">{formatPercent(showMetrics.terms.recordedRate)}</p>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.betaMetrics.duplicates', { count: showMetrics.duplicates.duplicateBookings })}
                </p>
              </CardContent>
            </Card>
            {/* #446: support tickets — rendered only when the service
                provides ticket counts; the rate itself stays "—" while
                the service marks it not derivable. */}
            {showMetrics.support && typeof showMetrics.support.ticketsOpened === 'number' && (
              <Card className="border-none shadow-sm rounded-2xl">
                <CardContent className="p-5 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('dashboard.betaMetrics.supportResponseRate')}</p>
                  <p className="text-2xl font-black text-foreground">{formatPercent(showMetrics.support.responseWithin48hPercent)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.betaMetrics.supportTickets', { count: showMetrics.support.ticketsOpened })}
                    {' · '}
                    {t('dashboard.betaMetrics.supportTicketsDetail', {
                      responded: showMetrics.support.ticketsWithFirstResponse ?? 0,
                      within: showMetrics.support.firstResponsesWithin48h ?? 0,
                    })}
                  </p>
                  {(showMetrics.support.awaitingFirstResponseOver48h ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t('dashboard.betaMetrics.supportAwaiting', { count: showMetrics.support.awaitingFirstResponseOver48h ?? 0 })}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="border-none shadow-sm rounded-2xl">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-foreground">{t('dashboard.betaMetrics.exitCriteria')}</h3>
              <ul className="space-y-2">
                {showMetrics.exitCriteria.map((criterion) => (
                  <li key={criterion.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{criterion.target}</span>
                    <span className="font-bold text-foreground">
                      {criterion.value === null || criterion.value === undefined
                        ? t('dashboard.betaMetrics.noData')
                        : `${criterion.value} · ${
                            criterion.pass === null || criterion.pass === undefined
                              ? t('dashboard.betaMetrics.noData')
                              : criterion.pass
                                ? t('dashboard.betaMetrics.pass')
                                : t('dashboard.betaMetrics.fail')
                          }`}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Honesty block: metrics the service cannot derive stay visibly
              not-derivable, with the service's own reason / note. */}
          <div className="space-y-2 text-sm text-muted-foreground">
            {showMetrics.support && showMetrics.support.derivable === false && (
              <p data-testid="beta-metrics-not-derivable">
                {t('dashboard.betaMetrics.supportNotDerivable')}: {showMetrics.support.reason}
              </p>
            )}
            {showMetrics.sweepPauses?.note && <p>{showMetrics.sweepPauses.note}</p>}
          </div>
        </>
      )}
    </section>
  );
}
