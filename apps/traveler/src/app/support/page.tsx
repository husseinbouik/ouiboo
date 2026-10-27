'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { SUPPORT_EMAIL, isSupportEmailConfigured, supportMailto } from '@/lib/support';
import { NORMAL_SUPPORT_RESPONSE_HOURS, REFUND_SLA_DAYS } from '@ouiboo/utils';

/**
 * #419 (Council P0-16): the published support operation. Two lanes,
 * honestly described:
 * - normal support by email, answered within 48 hours;
 * - an active-trip emergency lane: the agency's emergency contact
 *   (on the booking) first, OuiBoo escalation during the trip period.
 * No in-app chat, no 24/7 hotline, no "priority support" claims —
 * the copy promises only what a solo support operation can keep.
 */
export default function TravelerSupportPage() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  // Session #3 P0-7a (#555): when no monitored inbox is configured, the
  // page explains the support split without publishing an address —
  // the previous build published support@ouiboo.com, whose domain has
  // no DNS and cannot receive mail.
  const sections = [
    {
      title: t('support.normalTitle'),
      body: isSupportEmailConfigured
        ? t('support.normalBody', { hours: NORMAL_SUPPORT_RESPONSE_HOURS, email: SUPPORT_EMAIL ?? '' })
        : t('support.normalBodyNoEmail', { hours: NORMAL_SUPPORT_RESPONSE_HOURS }),
    },
    {
      title: t('support.emergencyTitle'),
      body: t('support.emergencyBody'),
    },
    {
      title: t('support.refundsTitle'),
      body: t('support.refundsBody', { days: REFUND_SLA_DAYS }),
    },
    {
      title: t('support.complaintsTitle'),
      body: isSupportEmailConfigured
        ? t('support.complaintsBody', { email: SUPPORT_EMAIL ?? '' })
        : t('support.complaintsBodyNoEmail'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="space-y-4">
          <Link href={`/bookings`} className="text-sm font-semibold text-sunset-orange hover:text-orange-600">
            {t('support.backToBookings')}
          </Link>
          <h1 className="text-4xl font-bold text-foreground">{t('support.title')}</h1>
          <p className="text-lg text-muted-foreground">{t('support.intro')}</p>
          {isSupportEmailConfigured && supportMailto() ? (
            <a
              href={supportMailto() ?? undefined}
              className="inline-flex items-center gap-2 text-base font-black text-sunset-orange hover:text-orange-600"
            >
              {SUPPORT_EMAIL}
            </a>
          ) : null}
        </div>

        <div className="mt-10 grid gap-6">
          {sections.map((section) => (
            <div key={section.title} className="rounded-2xl border border-border bg-muted p-6">
              <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
              <p className="mt-2 text-muted-foreground">{section.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">{t('support.safetyNote')}</p>
      </div>
    </div>
  );
}
