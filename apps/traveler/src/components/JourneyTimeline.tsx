'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';

export type JourneyStep = {
  title: string;
  description: string;
  state: 'complete' | 'current' | 'upcoming';
};

/**
 * Design Council Phase 2 — Booking detail A: the two-stage payment
 * journey (deposit -> balance) as page structure. A vertical timeline
 * with token colours only; the current step is the traveller's next
 * action, completed steps carry a check.
 */
export function JourneyTimeline({ steps, className }: { steps: JourneyStep[]; className?: string }) {
  const { t } = useTranslation();
  return (
    <section aria-label={t('bookingDetail.journeyTitle')} className={className} data-testid="journey-timeline">
      <h2 className="text-lg font-black text-foreground font-display tracking-tight">{t('bookingDetail.journeyTitle')}</h2>
      <ol className="mt-5 space-y-0">
        {steps.map((step, index) => (
          <li key={step.title} className="relative flex gap-4 pb-7 last:pb-0">
            {index < steps.length - 1 ? (
              <span aria-hidden="true" className={cn('absolute start-[15px] top-9 h-[calc(100%-2rem)] w-0.5', step.state === 'complete' ? 'bg-ocean-500' : 'bg-border')} />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                'z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black',
                step.state === 'complete'
                  ? 'border-ocean-600 bg-ocean-600 text-white'
                  : step.state === 'current'
                    ? 'border-sunset-orange bg-card text-sunset-orange-dark'
                    : 'border-border bg-card text-muted-foreground',
              )}
            >
              {step.state === 'complete' ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <div className="pt-1">
              <p className="text-sm font-black text-foreground">
                {step.title}
                {step.state === 'current' ? (
                  <span className="ms-2 rounded-full bg-sunset-orange/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-sunset-orange-dark">{t('bookingDetail.journeyNextStep')}</span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
