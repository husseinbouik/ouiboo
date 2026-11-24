'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';

/**
 * Design Council Phase 2 (trip detail A + Option C borrow): the
 * deposit-schedule visual. A segmented bar makes the staged split
 * legible at a glance — deposit (at most 30%, paid directly to the
 * agency) in sunset orange, the balance (only due after the group is
 * confirmed) in sand. Amounts arrive pre-formatted by the caller so
 * display-currency conversion stays with the owning surface.
 */
export function DepositSchedule({
  depositLabel,
  balanceLabel,
  depositPercent,
  className,
}: {
  depositLabel: string;
  balanceLabel: string;
  /** Deposit share of the total, 0-30 by the money rules. */
  depositPercent: number;
  className?: string;
}) {
  const { t } = useTranslation();
  const pct = Math.min(30, Math.max(0, Math.round(depositPercent)));
  return (
    <div className={className} data-testid="deposit-schedule">
      <p className="text-sm font-bold text-foreground">{t('tripDetails.depositScheduleTitle')}</p>
      <div
        className="mt-3 flex h-3.5 overflow-hidden rounded-full"
        role="img"
        aria-label={t('tripDetails.depositScheduleTitle')}
      >
        <div className="bg-sunset-orange" style={{ width: `${pct}%` }} />
        <div className="bg-sand" style={{ width: `${100 - pct}%` }} />
      </div>
      <div className="mt-2 flex items-start justify-between gap-4 text-[13px]">
        <span>
          <strong className="text-foreground">{t('tripDetails.depositNow', { percent: pct })}</strong>
          <br />
          <span className="text-muted-foreground">{depositLabel}</span>
        </span>
        <span className="text-end">
          <strong className="text-foreground">{t('tripDetails.balanceLater', { percent: 100 - pct })}</strong>
          <br />
          <span className="text-muted-foreground">{balanceLabel}</span>
        </span>
      </div>
      <p className={cn('mt-3 rounded-xl bg-sand/60 px-3.5 py-3 text-[13px] leading-relaxed text-foreground dark:bg-muted')}>
        {t('tripDetails.depositMinNotMet')}
      </p>
    </div>
  );
}
