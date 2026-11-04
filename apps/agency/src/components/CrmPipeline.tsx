'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import { formatCurrency } from '@ouiboo/utils';
import { crmStageLabelKey, type CrmPipeline as CrmPipelineData } from '@/lib/crm';

interface CrmPipelineProps {
  pipeline: CrmPipelineData;
  selectedStatus: string | null;
  onSelect: (status: string | null) => void;
}

/**
 * #786: the agency's booking pipeline — every booking status as a
 * stage with its count and total amount. Selecting a stage filters
 * the booking list below it (served by the existing agency bookings
 * endpoint with its status filter). Amounts are display-only sums of
 * booking totals; travellers pay the agency directly.
 */
export function CrmPipeline({ pipeline, selectedStatus, onSelect }: CrmPipelineProps) {
  const { t, i18n } = useTranslation();

  return (
    <section aria-label={t('crm.pipelineTitle')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{t('crm.pipelineTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('crm.pipelineSubtitle')}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('crm.totalBookedValue')}:{' '}
          <span className="font-semibold text-foreground">
            {formatCurrency(pipeline.totals.bookedValue, pipeline.totals.currency, i18n.language)}
          </span>
          {' · '}
          {t('crm.refundCases')}: {pipeline.refundCases.total} ({t('crm.refundCasesOpen', { count: pipeline.refundCases.open })})
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <button
          type="button"
          aria-pressed={selectedStatus === null}
          onClick={() => onSelect(null)}
          className={cn(
            'rounded-xl border p-3 text-start transition-colors',
            selectedStatus === null
              ? 'border-primary bg-primary/10'
              : 'border-border bg-card hover:bg-muted/50',
          )}
        >
          <span className="block text-sm font-medium">{t('crm.allStages')}</span>
          <span className="mt-1 block text-2xl font-bold">{pipeline.totals.bookings}</span>
          <span className="block text-sm text-muted-foreground">
            {formatCurrency(pipeline.totals.bookedValue, pipeline.totals.currency, i18n.language)}
          </span>
        </button>

        {pipeline.stages.map((stage) => (
          <button
            key={stage.status}
            type="button"
            aria-pressed={selectedStatus === stage.status}
            onClick={() => onSelect(selectedStatus === stage.status ? null : stage.status)}
            className={cn(
              'rounded-xl border p-3 text-start transition-colors',
              selectedStatus === stage.status
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:bg-muted/50',
            )}
          >
            <span className="block text-sm font-medium">{t(crmStageLabelKey(stage.status))}</span>
            <span className="mt-1 block text-2xl font-bold">{stage.count}</span>
            <span className="block text-sm text-muted-foreground">
              {formatCurrency(stage.totalAmount, stage.currency, i18n.language)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Loading placeholder kept structurally identical to the board. */
export function CrmPipelineSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </CardContent>
    </Card>
  );
}
