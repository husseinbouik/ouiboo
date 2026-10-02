'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

export default function AgencyTermsPage() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const sections = [
    { title: t('terms.sectionOneTitle'), body: t('terms.sectionOneBody') },
    { title: t('terms.sectionTwoTitle'), body: t('terms.sectionTwoBody') },
    { title: t('terms.sectionThreeTitle'), body: t('terms.sectionThreeBody') },
    { title: t('terms.sectionFourTitle'), body: t('terms.sectionFourBody') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="space-y-4">
          <Link href={`/signup?lang=${i18n.language}`} className="text-sm font-semibold text-primary hover:text-primary/80 dark:text-accent dark:hover:text-accent/80">
            {t('terms.backToSignup')}
          </Link>
          <h1 className="text-4xl font-bold text-foreground">{t('terms.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('terms.updated')}</p>
          <p className="text-lg text-muted-foreground">{t('terms.intro')}</p>
        </div>

        <div className="mt-10 grid gap-6">
          {sections.map((section) => (
            <div key={section.title} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
              <p className="mt-2 text-muted-foreground">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
