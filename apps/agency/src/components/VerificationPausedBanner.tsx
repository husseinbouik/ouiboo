'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@ouiboo/ui';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { getVerificationPause } from '@/lib/agency-verification';

/**
 * #415 (Council P0-08): shown when the expiry sweep has paused the agency
 * (licence and/or RC insurance EXPIRED — the sweep stamps
 * `verificationPausedAt` and pauses ACTIVE trips). Points the agency at
 * the onboarding page to renew the lapsed document. `showCta` is off on
 * the onboarding page itself, where the renewal form is already on screen.
 */
export function VerificationPausedBanner({ showCta = true }: { showCta?: boolean }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const profile = user?.agencyProfile;
  const pause = getVerificationPause(profile);

  if (!profile || !pause.paused) return null;

  const reasons = [
    pause.licenceExpired ? t('verificationPaused.licenceExpired') : null,
    pause.insuranceExpired ? t('verificationPaused.insuranceExpired') : null,
  ].filter(Boolean);

  return (
    <div
      role="alert"
      className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger flex items-start gap-3"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <p className="font-bold">{t('verificationPaused.title')}</p>
        <p>
          {reasons.length > 0 ? `${reasons.join(' ')} ` : ''}
          {t('verificationPaused.body')}
        </p>
        {profile.verificationPauseReason && (
          <p className="text-xs opacity-80">{profile.verificationPauseReason}</p>
        )}
      </div>
      {showCta && (
        <Button asChild size="sm" variant="outline" className="shrink-0 font-bold">
          <Link href="/dashboard/onboarding">{t('verificationPaused.cta')}</Link>
        </Button>
      )}
    </div>
  );
}
