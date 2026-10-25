'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@ouiboo/utils';
import type { CancellationScaleSnapshot } from '@ouiboo/types';

type CancellationScaleCardProps = {
  scale?: CancellationScaleSnapshot | null;
  /**
   * The amount the band percentages apply to (session price or booking
   * total) when known, so the traveller sees refund amounts in the
   * trip's currency — not just percentages — before paying.
   */
  baseAmount?: number | null;
  currency?: string;
  className?: string;
};

/**
 * #417 (Council P0-11): the trip's cancellation scale.
 *
 * The floor comes first (agency fault / minimum group not reached =
 * 100% refund, initiated within the floor's days), then the bands for
 * traveller-initiated cancellations. Refunds are paid by the agency —
 * the card says so, because Ouiboo never holds traveller money.
 */
export function CancellationScaleCard({ scale, baseAmount, currency, className }: CancellationScaleCardProps) {
  const { t, i18n } = useTranslation();

  if (!scale || !Array.isArray(scale.bands) || scale.bands.length === 0) {
    return null;
  }

  const bands = [...scale.bands].sort((a, b) => b.minDaysBeforeStart - a.minDaysBeforeStart);
  const floorPercent = scale.floorRefundPercent ?? 100;
  const initiationDays = scale.refundInitiationDays ?? 7;

  const bandLabel = (index: number) => {
    const band = bands[index];
    if (index < bands.length - 1) {
      return t('cancellation.bandAtLeast', { days: band.minDaysBeforeStart });
    }
    if (bands.length === 1) {
      return t('cancellation.bandAnyTime');
    }
    return t('cancellation.bandLessThan', { days: bands[bands.length - 2].minDaysBeforeStart });
  };

  return (
    <section aria-label={t('cancellation.title')} className={className}>
      <div className="rounded-[2rem] border border-border bg-card p-6 space-y-5">
        <h3 className="flex items-center gap-2 text-lg font-black text-foreground font-display">
          <ShieldCheck className="h-5 w-5 text-sunset-orange" />
          {t('cancellation.title')}
        </h3>

        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>{t('cancellation.floorAgency', { percent: floorPercent, days: initiationDays })}</li>
          <li>{t('cancellation.floorMinimum', { percent: floorPercent, days: initiationDays })}</li>
        </ul>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">
            {t('cancellation.ifYouCancel')}
          </p>
          <ul className="divide-y divide-border/60">
            {bands.map((band, index) => (
              <li key={band.minDaysBeforeStart} className="flex items-center justify-between gap-4 py-2 text-sm">
                <span className="text-muted-foreground">{bandLabel(index)}</span>
                <span className="text-end font-bold text-foreground whitespace-nowrap">
                  {t('cancellation.refundPercent', { percent: band.refundPercent })}
                  {baseAmount != null && currency
                    ? ` · ${formatCurrency((Number(baseAmount) * band.refundPercent) / 100, currency, i18n.language)}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">{t('cancellation.paidByAgency')}</p>
      </div>
    </section>
  );
}
