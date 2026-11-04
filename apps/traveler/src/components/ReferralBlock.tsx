'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Link2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { copyShareLink } from '@ouiboo/utils';
import { apiClient } from '@/lib/api-client';
import { absoluteTravelerUrl } from '@/lib/site';

type ReferralsResponse = {
  referralCode: string;
  referralCount: number;
};

/**
 * #777: zero-value referral — tracked sharing + recognition ONLY.
 * Shows the traveller's personal signup link, a copy action (the #468
 * share/copy pattern) and how many travellers they have introduced.
 * Nothing of value is offered, earned, or displayed here.
 */
export function ReferralBlock() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    },
    [],
  );

  const { data } = useQuery<ReferralsResponse>({
    queryKey: ['me', 'referrals'],
    queryFn: async () => {
      const response = await apiClient.get('/users/me/referrals');
      return response.data;
    },
  });

  if (!data?.referralCode) return null;

  const referralLink = absoluteTravelerUrl(`/signup?ref=${encodeURIComponent(data.referralCode)}`);
  const count = data.referralCount ?? 0;

  const handleCopy = async () => {
    const ok = await copyShareLink(referralLink);
    if (!ok) return;
    setCopied(true);
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section data-testid="referral-block" aria-label={t('referral.title')} className="border-none shadow-2xl shadow-deep-blue/5 dark:shadow-none dark:ring-1 dark:ring-border rounded-4xl overflow-hidden bg-card p-10 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sunset-orange/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-sunset-orange" />
        </div>
        <h2 className="text-2xl font-black text-foreground font-display">{t('referral.title')}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{t('referral.description')}</p>
      <p data-testid="referral-count" className="text-base font-bold text-foreground">
        {count === 0
          ? t('referral.thankYouZero')
          : count === 1
            ? t('referral.introducedOne')
            : t('referral.introduced', { count })}
      </p>
      <div className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('referral.yourLink')}</span>
        <div className="flex flex-wrap items-center gap-3">
          <code data-testid="referral-link" className="flex-1 min-w-56 break-all rounded-2xl bg-muted/50 dark:bg-card px-4 py-3 text-sm font-semibold text-foreground">
            {referralLink}
          </code>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-sunset-orange px-5 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-orange-600 active:scale-95"
          >
            {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            {copied ? t('share.copied') : t('share.copyLink')}
          </button>
        </div>
      </div>
    </section>
  );
}
