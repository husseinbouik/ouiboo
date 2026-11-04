'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import type { CancellationSummary } from '@ouiboo/types';
import { cn } from '@ouiboo/ui/utils';

/**
 * #687 (Council S6): the ONE-LINE cancellation summary, repeated where
 * travellers decide (card, trip hero, booking box). Derived server-side
 * from the trip's structured scale under the standardised definition;
 * every rendering names the AGENCY as refund obligor — Ouiboo never
 * refunds, because it never holds the money.
 */
export function CancellationOneLiner({
  summary,
  agencyName,
  className,
}: {
  summary?: CancellationSummary | null;
  agencyName?: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  if (!summary) return null;
  const agency = agencyName?.trim() || t('batchF.theAgency');
  return (
    <p
      data-testid="cancellation-one-liner"
      className={cn('flex items-start gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400', className)}
    >
      <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-px" />
      <span>
        {summary.freeCancellation && summary.freeCancellationDays !== null
          ? t('batchF.freeCancellationUntil', { days: summary.freeCancellationDays, agency })
          : t('batchF.noFreeCancellation', { agency })}
      </span>
    </p>
  );
}
