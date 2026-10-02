'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'ouiboo_analytics_consent';
const PREFERENCES_EVENT = 'ouiboo:open-cookie-preferences';

type Consent = 'accepted' | 'declined' | null;

export function CookiePreferencesButton({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const analyticsConfigured = Boolean(
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID,
  );

  if (!analyticsConfigured) return null;

  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(PREFERENCES_EVENT))}
    >
      {t('analyticsConsent.cookieSettings')}
    </button>
  );
}

export default function AnalyticsConsent() {
  const { t } = useTranslation();
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const analyticsConfigured = Boolean(gaMeasurementId || clarityProjectId);
  const [consent, setConsent] = useState<Consent>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!analyticsConfigured) return;

    const storedConsent = window.localStorage.getItem(STORAGE_KEY);
    if (storedConsent === 'accepted' || storedConsent === 'declined') {
      setConsent(storedConsent);
    } else {
      setShowPrompt(true);
    }

    const openPreferences = () => setShowPrompt(true);
    window.addEventListener(PREFERENCES_EVENT, openPreferences);
    return () => window.removeEventListener(PREFERENCES_EVENT, openPreferences);
  }, [analyticsConfigured]);

  useEffect(() => {
    if (consent !== 'accepted' || !clarityProjectId) return;

    void import('@microsoft/clarity').then(({ default: Clarity }) => {
      Clarity.init(clarityProjectId);
    });
  }, [clarityProjectId, consent]);

  const saveConsent = (value: Exclude<Consent, null>) => {
    window.localStorage.setItem(STORAGE_KEY, value);
    setConsent(value);
    setShowPrompt(false);

    if (gaMeasurementId) {
      (window as unknown as Record<string, boolean>)[`ga-disable-${gaMeasurementId}`] = value !== 'accepted';
    }
  };

  if (!analyticsConfigured) return null;

  return (
    <>
      {consent === 'accepted' && gaMeasurementId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`}
            strategy="afterInteractive"
          />
          <Script id="ouiboo-google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('consent', 'default', { analytics_storage: 'granted' });
              gtag('config', ${JSON.stringify(gaMeasurementId)}, { anonymize_ip: true });
            `}
          </Script>
        </>
      ) : null}

      {showPrompt ? (
        <section
          aria-label={t('analyticsConsent.preferencesLabel')}
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl sm:flex sm:items-center sm:gap-6"
        >
          <div className="flex-1">
            <h2 className="text-base font-bold">{t('analyticsConsent.title')}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t('analyticsConsent.intro')}{' '}
              <Link className="font-semibold text-orange-700 underline" href="/privacy">
                {t('analyticsConsent.privacyNotice')}
              </Link>.
            </p>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:mt-0 sm:flex-row">
            <button
              type="button"
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
              onClick={() => saveConsent('declined')}
            >
              {t('analyticsConsent.continueWithoutAnalytics')}
            </button>
            <button
              type="button"
              className="rounded-lg bg-deep-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90 dark:bg-sunset-orange"
              onClick={() => saveConsent('accepted')}
            >
              {t('analyticsConsent.allowAnalytics')}
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
