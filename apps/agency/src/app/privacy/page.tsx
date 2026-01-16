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
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="space-y-4">
          <Link href={`/signup?lang=${i18n.language}`} className="text-sm font-semibold text-deep-blue hover:text-blue-700">
            {t('privacy.backToSignup')}
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">{t('privacy.title')}</h1>
          <p className="text-sm text-gray-500">{t('privacy.updated')}</p>
          <p className="text-lg text-gray-600">{t('privacy.intro')}</p>
        </div>

        <div className="mt-10 rounded-2xl border border-gray-100 bg-gray-50 p-6">
          <h2 className="text-xl font-semibold text-gray-900">{t('privacy.highlightsTitle')}</h2>
          <ul className="mt-4 space-y-3 text-gray-600">
            {highlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-deep-blue" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900">{t('privacy.contactTitle')}</h2>
          <p className="mt-2 text-gray-600">{t('privacy.contactBody')}</p>
        </div>
      </div>
    </div>
  );
}
