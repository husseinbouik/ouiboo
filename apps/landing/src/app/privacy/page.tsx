'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { CookiePreferencesButton } from '../../components/AnalyticsConsent';

export default function PrivacyPage() {
  const { t, i18n } = useTranslation();
  const updatedDate = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(new Date('2026-09-09'));

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background px-6 py-16 text-foreground sm:py-24">
      <article className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-12">
        <Link href="/" className="text-sm font-semibold text-orange-700 hover:underline">
          {t('privacy.back')}
        </Link>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">{t('privacy.title')}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t('privacy.updated', { date: updatedDate })}</p>

        <div className="mt-10 space-y-8 text-base leading-7 text-muted-foreground">
          <section>
            <h2 className="text-xl font-bold text-foreground">{t('privacy.section1.title')}</h2>
            <p className="mt-2">{t('privacy.section1.body')}</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground">{t('privacy.section2.title')}</h2>
            <p className="mt-2">{t('privacy.section2.body')}</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground">{t('privacy.section3.title')}</h2>
            <p className="mt-2">{t('privacy.section3.body')}</p>
            <CookiePreferencesButton className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted" />
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground">{t('privacy.section4.title')}</h2>
            <p className="mt-2">{t('privacy.section4.body')}</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground">{t('privacy.section5.title')}</h2>
            <p className="mt-2">{t('privacy.section5.body')}</p>
          </section>
        </div>
      </article>
    </main>
  );
}