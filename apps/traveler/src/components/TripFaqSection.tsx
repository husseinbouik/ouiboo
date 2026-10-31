'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TripFaqEntry } from '@ouiboo/types';

/**
 * #686 (Council S6): the per-trip FAQ block — entries generated from
 * structured trip data plus the capped agency-authored Q&As, rendered
 * in the reader's language (fallback French, the canonical locale),
 * with the FAQPage JSON-LD the API built from the same entries.
 */
export function pickFaqText(map: Record<string, string> | undefined, locale: string): string {
  if (!map) return '';
  const lang = (locale || 'fr').split('-')[0].toLowerCase();
  return map[lang] ?? map.fr ?? map.en ?? Object.values(map)[0] ?? '';
}

export function TripFaqSection({
  generatedFaqs,
  faqs,
  faqJsonLd,
}: {
  generatedFaqs?: TripFaqEntry[] | null;
  faqs?: TripFaqEntry[] | null;
  faqJsonLd?: Record<string, unknown> | null;
}) {
  const { t, i18n } = useTranslation();
  const entries = [...(generatedFaqs ?? []), ...(faqs ?? [])];
  if (entries.length === 0) return null;
  return (
    <section aria-label={t('batchF.faqTitle')} className="space-y-6 pt-6" data-testid="trip-faq">
      {faqJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      ) : null}
      <h2 className="text-2xl font-bold text-foreground font-display">{t('batchF.faqTitle')}</h2>
      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <div key={idx} className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-bold text-foreground text-sm">{pickFaqText(entry.question, i18n.language)}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{pickFaqText(entry.answer, i18n.language)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
