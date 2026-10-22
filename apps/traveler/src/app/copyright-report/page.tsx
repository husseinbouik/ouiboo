'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { apiClient } from '@/lib/api-client';

// Public copyright takedown form (#325). Posts to POST /copyright/reports;
// the API requires the rights attestation and stores the notice for admin
// review. An ACTIONED resolution can deactivate the reported trip.
export default function CopyrightReportPage() {
  const { t, i18n } = useTranslation();
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [description, setDescription] = useState('');
  const [attestation, setAttestation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post('/copyright/reports', {
        reporterName,
        reporterEmail,
        contentUrl,
        description,
        rightsAttestation: attestation,
      });
      setSubmitted(true);
    } catch {
      setError(t('copyright.error', 'We could not submit your report. Check the fields and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground focus:bg-background focus:border-sunset-orange outline-none transition-all';

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/terms" className="text-sm font-semibold text-sunset-orange hover:text-orange-600">
          {t('copyright.backToTerms', 'Back to Terms of Service')}
        </Link>
        <h1 className="mt-4 text-4xl font-bold text-foreground">
          {t('copyright.title', 'Report copyright infringement')}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {t(
            'copyright.intro',
            'Use this form to file a takedown notice. We review valid notices promptly and remove or disable access to infringing material; repeat infringers lose their accounts. If your content was removed in error, file this form as a counter-notice and say so in the description.',
          )}
        </p>

        {submitted ? (
          <div className="mt-10 rounded-2xl border border-border bg-muted p-6">
            <h2 className="text-xl font-semibold text-foreground">
              {t('copyright.receivedTitle', 'Report received')}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t('copyright.receivedBody', 'Thank you. Your notice has been recorded and will be reviewed by our team. We may contact you at the email you provided.')}
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="reporterName" className="text-sm font-semibold text-foreground">
                {t('copyright.name', 'Your full name')}
              </label>
              <input id="reporterName" className={inputClass} value={reporterName} onChange={(e) => setReporterName(e.target.value)} required minLength={2} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="reporterEmail" className="text-sm font-semibold text-foreground">
                {t('copyright.email', 'Your email')}
              </label>
              <input id="reporterEmail" type="email" className={inputClass} value={reporterEmail} onChange={(e) => setReporterEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="contentUrl" className="text-sm font-semibold text-foreground">
                {t('copyright.contentUrl', 'Link to the content on Ouiboo')}
              </label>
              <input id="contentUrl" type="url" className={inputClass} value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} required placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-semibold text-foreground">
                {t('copyright.description', 'Describe your work and the infringement')}
              </label>
              <textarea id="description" className={inputClass} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} required minLength={20} />
            </div>
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input type="checkbox" className="mt-1" checked={attestation} onChange={(e) => setAttestation(e.target.checked)} required />
              <span>
                {t(
                  'copyright.attestation',
                  'I have a good-faith belief that the use described is not authorized by the copyright owner, its agent, or the law, and, under penalty of perjury, the information in this notice is accurate and I am the owner or authorized to act on the owner\'s behalf.',
                )}
              </span>
            </label>
            {error && (
              <div role="alert" className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || !attestation}
              className="w-full rounded-xl bg-sunset-orange px-6 py-3.5 font-semibold text-white transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? t('copyright.submitting', 'Submitting...') : t('copyright.submit', 'Submit report')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
