'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@ouiboo/ui';
import { NORMAL_SUPPORT_RESPONSE_HOURS } from '@ouiboo/utils';
import { useAuth } from './AuthContext';
import { SupportBlock } from './SupportBlock';
import { BetaOfferCard } from './BetaOfferCard';
import { apiClient } from '@/lib/api-client';
import { isSupportEmailConfigured, SUPPORT_EMAIL } from '@/lib/support';

const CATEGORIES = [
  { value: 'BOOKING', labelKey: 'support.form.categoryBooking' },
  { value: 'PAYMENT', labelKey: 'support.form.categoryPayment' },
  { value: 'REFUND', labelKey: 'support.form.categoryRefund' },
  { value: 'ACCOUNT', labelKey: 'support.form.categoryAccount' },
  { value: 'TRIP', labelKey: 'support.form.categoryTrip' },
  { value: 'COMPLAINT', labelKey: 'support.form.categoryComplaint' },
  { value: 'TECHNICAL', labelKey: 'support.form.categoryTechnical' },
  { value: 'OTHER', labelKey: 'support.form.categoryOther' },
] as const;

/**
 * #556 rework: the agency support PAGE. PR-era work shipped the footer
 * SupportBlock (dashboard / refunds / onboarding) but no route for it to
 * land on, so /support and /dashboard/support both rendered the agency
 * "Page not found". This page is served from BOTH routes (see
 * app/support/page.tsx and app/dashboard/support/page.tsx).
 *
 * Content: the same minimal support block as the traveller side, from
 * the same configuration source (apps/agency/src/lib/support.ts mirrors
 * the traveller lib: NEXT_PUBLIC_SUPPORT_EMAIL, hidden gracefully when
 * unconfigured, ≤48h normal lane, the agency's own active-trip
 * escalation role) — rendered via <BetaOfferCard />
      <SupportBlock /> — PLUS a working
 * ticket form posting to POST /support/tickets with
 * requesterRole=AGENCY, prefilled from the signed-in agency user.
 */
export function AgencySupportPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [requesterName, setRequesterName] = useState(user?.name ?? '');
  const [requesterEmail, setRequesterEmail] = useState(user?.email ?? '');
  const [category, setCategory] = useState('OTHER');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Prefill once the session user resolves (it can arrive after mount).
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  if (user && prefilledFor !== user.id) {
    setPrefilledFor(user.id);
    if (!requesterName) setRequesterName(user.name ?? '');
    if (!requesterEmail) setRequesterEmail(user.email ?? '');
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post('/support/tickets', {
        requesterName,
        requesterEmail,
        requesterRole: 'AGENCY',
        category,
        subject,
        message,
        bookingRef: bookingRef.trim() ? bookingRef.trim() : undefined,
      });
      setSubmitted(true);
    } catch {
      setError(t('support.form.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground focus:bg-background focus:border-sunset-orange outline-none transition-all';

  return (
    <div className="space-y-6" data-testid="agency-support-page">
      <div>
        <h1 className="text-2xl font-black text-foreground md:text-3xl">{t('support.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('support.intro', { hours: NORMAL_SUPPORT_RESPONSE_HOURS })}</p>
        {isSupportEmailConfigured && SUPPORT_EMAIL ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {t('support.contactLine', { email: SUPPORT_EMAIL })}
          </p>
        ) : null}
      </div>

      <SupportBlock />

      {/* #677: the beta offer (verification SLA, assisted listing,
          support split) also lives on the support surface. */}
      <BetaOfferCard />

      <Card className="border border-border shadow-sm bg-card">
        <CardContent className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">{t('support.form.title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('support.form.intro', { hours: NORMAL_SUPPORT_RESPONSE_HOURS })}
            </p>
          </div>

          {submitted ? (
            <div data-testid="agency-support-ticket-received" className="rounded-2xl border border-border bg-muted p-6">
              <h3 className="text-lg font-semibold text-foreground">{t('support.form.receivedTitle')}</h3>
              <p className="mt-2 text-muted-foreground">
                {t('support.form.receivedBody', { hours: NORMAL_SUPPORT_RESPONSE_HOURS })}
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="agency-support-name" className="text-sm font-semibold text-foreground">{t('support.form.name')}</label>
                  <input id="agency-support-name" className={inputClass} value={requesterName} onChange={(e) => setRequesterName(e.target.value)} required minLength={2} maxLength={120} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="agency-support-email" className="text-sm font-semibold text-foreground">{t('support.form.email')}</label>
                  <input id="agency-support-email" type="email" className={inputClass} value={requesterEmail} onChange={(e) => setRequesterEmail(e.target.value)} required maxLength={320} />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="agency-support-category" className="text-sm font-semibold text-foreground">{t('support.form.category')}</label>
                  <select id="agency-support-category" className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="agency-support-booking-ref" className="text-sm font-semibold text-foreground">
                    {t('support.form.bookingRef')} <span className="font-normal text-muted-foreground">({t('support.form.bookingRefOptional')})</span>
                  </label>
                  <input id="agency-support-booking-ref" className={inputClass} value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} maxLength={120} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="agency-support-subject" className="text-sm font-semibold text-foreground">{t('support.form.subject')}</label>
                <input id="agency-support-subject" className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={3} maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="agency-support-message" className="text-sm font-semibold text-foreground">{t('support.form.message')}</label>
                <textarea id="agency-support-message" className={inputClass} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} maxLength={4000} />
              </div>
              {error ? (
                <div role="alert" className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
                  {error}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-sunset-orange px-6 py-3.5 font-semibold text-white transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? t('support.form.submitting') : t('support.form.submit')}
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AgencySupportPage;
