'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

export default function AgencyPrivacyPage() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const highlights = [
    t('privacy.highlightOne'),
    t('privacy.highlightTwo'),
    t('privacy.highlightThree'),
    t('privacy.highlightFour'),
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="space-y-4">
          <Link href={`/signup?lang=${i18n.language}`} className="text-sm font-semibold text-primary hover:text-primary/80 dark:text-accent dark:hover:text-accent/80">
            {t('privacy.backToSignup')}
          </Link>
          <h1 className="text-4xl font-bold text-foreground">{t('privacy.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('privacy.updated')}</p>
          <p className="text-lg text-muted-foreground">{t('privacy.intro')}</p>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground">{t('privacy.highlightsTitle')}</h2>
          <ul className="mt-4 space-y-3 text-muted-foreground">
            {highlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary dark:bg-accent" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-background p-6">
          <h2 className="text-xl font-semibold text-foreground">{t('privacy.contactTitle')}</h2>
          <p className="mt-2 text-muted-foreground">{t('privacy.contactBody')}</p>
        </div>
      </div>
    </div>
  );
}
