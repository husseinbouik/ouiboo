'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { apiClient } from '@/lib/api-client';
import { isSupportEmailConfigured, supportMailto } from '@/lib/support';
import { NORMAL_SUPPORT_RESPONSE_HOURS } from '@ouiboo/utils';
import { ModelExplainer } from '@/components/ModelExplainer';

/**
 * #446 (Council P2-07): the help centre.
 *
 * One surface that brings together what already existed separately:
 * - the answers the support operation already publishes (#419 support
 *   page, the launch macros) as a searchable FAQ — no new promises,
 *   the same facts in every language (pay the agency directly, proof
 *   is not settlement, refunds are paid by the agency within the
 *   7-day initiation SLA, agency first during an active trip);
 * - a ticket form that opens a stored support ticket
 *   (POST /support/tickets) instead of only an email, so a first
 *   response can be timestamped and measured. Email stays available
 *   as the fallback lane whenever it is configured.
 */
const FAQ_IDS = [
  'bookingConfirmation',
  'paymentProof',
  'paymentRejected',
  'refundTiming',
  'refundStatus',
  'tripEmergency',
  'normalSupport',
  'complaint',
] as const;

const CATEGORIES = [
  { value: 'BOOKING', labelKey: 'help.form.categoryBooking' },
  { value: 'PAYMENT', labelKey: 'help.form.categoryPayment' },
  { value: 'REFUND', labelKey: 'help.form.categoryRefund' },
  { value: 'ACCOUNT', labelKey: 'help.form.categoryAccount' },
  { value: 'TRIP', labelKey: 'help.form.categoryTrip' },
  { value: 'COMPLAINT', labelKey: 'help.form.categoryComplaint' },
  { value: 'TECHNICAL', labelKey: 'help.form.categoryTechnical' },
  { value: 'OTHER', labelKey: 'help.form.categoryOther' },
] as const;

export default function HelpCentrePage() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(FAQ_IDS[0]);

  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterRole, setRequesterRole] = useState('TRAVELER');
  const [category, setCategory] = useState('BOOKING');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const visibleFaq = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [...FAQ_IDS];
    return FAQ_IDS.filter((id) => {
      const haystack = `${t(`help.faq.${id}.question`)} ${t(`help.faq.${id}.answer`)}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, t]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post('/support/tickets', {
        requesterName,
        requesterEmail,
        requesterRole,
        category,
        subject,
        message,
        bookingRef: bookingRef.trim() ? bookingRef.trim() : undefined,
      });
      setSubmitted(true);
    } catch {
      setError(t('help.form.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground focus:bg-background focus:border-sunset-orange outline-none transition-all';
  const mailto = supportMailto();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="space-y-4">
          <Link href="/support" className="text-sm font-semibold text-sunset-orange hover:text-orange-600">
            {t('help.backToSupport')}
          </Link>
          <h1 className="text-4xl font-bold text-foreground">{t('help.title')}</h1>
          <p className="text-lg text-muted-foreground">{t('help.intro', { hours: NORMAL_SUPPORT_RESPONSE_HOURS })}</p>
        </div>

        <div className="mt-10 space-y-3">
          <label htmlFor="help-search" className="text-sm font-semibold text-foreground">
            {t('help.searchLabel')}
          </label>
          <input
            id="help-search"
            type="search"
            className={inputClass}
            placeholder={t('help.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* #678 (Council S6): the model explainer + general FAQ, on the
            help page as well as landing and checkout. */}
        <ModelExplainer className="mt-12" />

        <section aria-label={t('help.faqTitle')} className="mt-10">
          <h2 className="text-2xl font-bold text-foreground">{t('help.faqTitle')}</h2>
          <div className="mt-6 grid gap-4">
            {visibleFaq.map((id) => (
              <div key={id} className="rounded-2xl border border-border bg-muted p-6">
                <button
                  type="button"
                  className="w-full text-start text-lg font-semibold text-foreground"
                  aria-expanded={openId === id}
                  onClick={() => setOpenId(openId === id ? null : id)}
                >
                  {t(`help.faq.${id}.question`)}
                </button>
                {openId === id ? (
                  <p className="mt-2 text-muted-foreground">
                    {t(`help.faq.${id}.answer`, { hours: NORMAL_SUPPORT_RESPONSE_HOURS })}
                  </p>
                ) : null}
              </div>
            ))}
            {visibleFaq.length === 0 ? <p className="text-muted-foreground">{t('help.noResults')}</p> : null}
          </div>
        </section>

        <section aria-label={t('help.form.title')} className="mt-14">
          <h2 className="text-2xl font-bold text-foreground">{t('help.form.title')}</h2>
          <p className="mt-2 text-muted-foreground">{t('help.form.intro', { hours: NORMAL_SUPPORT_RESPONSE_HOURS })}</p>

          {submitted ? (
            <div className="mt-6 rounded-2xl border border-border bg-muted p-6" data-testid="help-ticket-received">
              <h3 className="text-xl font-semibold text-foreground">{t('help.form.receivedTitle')}</h3>
              <p className="mt-2 text-muted-foreground">
                {t('help.form.receivedBody', { hours: NORMAL_SUPPORT_RESPONSE_HOURS })}
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="help-name" className="text-sm font-semibold text-foreground">{t('help.form.name')}</label>
                  <input id="help-name" className={inputClass} value={requesterName} onChange={(e) => setRequesterName(e.target.value)} required minLength={2} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="help-email" className="text-sm font-semibold text-foreground">{t('help.form.email')}</label>
                  <input id="help-email" type="email" className={inputClass} value={requesterEmail} onChange={(e) => setRequesterEmail(e.target.value)} required />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="help-role" className="text-sm font-semibold text-foreground">{t('help.form.role')}</label>
                  <select id="help-role" className={inputClass} value={requesterRole} onChange={(e) => setRequesterRole(e.target.value)}>
                    <option value="TRAVELER">{t('help.form.roleTraveler')}</option>
                    <option value="AGENCY">{t('help.form.roleAgency')}</option>
                    <option value="GUEST">{t('help.form.roleGuest')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="help-category" className="text-sm font-semibold text-foreground">{t('help.form.category')}</label>
                  <select id="help-category" className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="help-subject" className="text-sm font-semibold text-foreground">{t('help.form.subject')}</label>
                <input id="help-subject" className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={3} maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="help-booking-ref" className="text-sm font-semibold text-foreground">
                  {t('help.form.bookingRef')} <span className="font-normal text-muted-foreground">({t('help.form.bookingRefOptional')})</span>
                </label>
                <input id="help-booking-ref" className={inputClass} value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="help-message" className="text-sm font-semibold text-foreground">{t('help.form.message')}</label>
                <textarea id="help-message" className={inputClass} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} maxLength={4000} />
              </div>
              {error ? (
                <div role="alert" className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
                  <p>{error}</p>
                  {isSupportEmailConfigured && mailto ? (
                    <p className="mt-1">
                      <a href={mailto} className="underline">{t('help.form.emailFallback')}</a>
                    </p>
                  ) : null}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-sunset-orange px-6 py-3.5 font-semibold text-white transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? t('help.form.submitting') : t('help.form.submit')}
              </button>
            </form>
          )}
        </section>

        <p className="mt-10 text-sm text-muted-foreground">{t('support.safetyNote')}</p>
      </div>
    </div>
  );
}
