'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { useAuth } from './AuthContext';
import { X, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export function TrialBanner() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const dismissed = useSyncExternalStore(
    () => () => undefined,
    () => (typeof window !== 'undefined' ? localStorage.getItem('trial_banner_dismissed') === 'true' : false),
    () => false,
  );
  const [isDismissed, setIsDismissed] = useState(false);

  const isVisible = useMemo(() => {
    return (
      !dismissed &&
      !isDismissed &&
      user?.role === 'AGENCY' &&
      user?.agencyProfile?.subscriptionStatus === 'TRIAL' &&
      Boolean(user?.agencyProfile?.trialEndsAt)
    );
  }, [dismissed, isDismissed, user]);

  if (!isVisible || !user?.agencyProfile?.trialEndsAt) return null;

  const calculateDaysLeft = (endsAt: string | Date): number => {
    const end = new Date(endsAt).getTime();
    const now = new Date().getTime();
    return Math.ceil((end - now) / (1000 * 3600 * 24));
  };

  const daysLeft = calculateDaysLeft(user.agencyProfile.trialEndsAt);
  const isUrgent = daysLeft <= 3;

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('trial_banner_dismissed', 'true');
  };

  return (
    <div className={cn(
      "fixed bottom-4 end-4 start-4 md:start-auto md:w-[400px] z-50 transition-all duration-300 transform translate-y-0",
      isUrgent ? "bg-danger/10 border-danger/30" : "bg-accent/10 border-accent/30",
      "border rounded-xl shadow-lg p-4"
    )}>
      <div className="flex items-start gap-3">
        {isUrgent ? (
          <AlertTriangle className="h-5 w-5 text-danger mt-0.5" />
        ) : (
          <Clock className="h-5 w-5 text-accent mt-0.5" />
        )}
        <div className="flex-1">
          <h4 className={cn("font-semibold text-sm", isUrgent ? "text-danger" : "text-accent")}>
            {t('trialBanner.title')}
          </h4>
          <p className={cn("text-xs mt-1 leading-relaxed", isUrgent ? "text-danger" : "text-accent")}>
            {t('trialBanner.body', { daysLeft })}
            {isUrgent ? ` ${t('trialBanner.upgradeNow')}` : ` ${t('trialBanner.meaningfulFeatures')}`}
          </p>
          <Button 
            size="sm" 
            className={cn("mt-3 w-full h-8 text-xs", isUrgent ? "bg-danger text-danger-foreground hover:bg-danger/90" : "bg-accent text-accent-foreground hover:bg-accent/90")}
            onClick={() => router.push('/dashboard/settings/billing')}
          >
            {t('trialBanner.upgrade')}
          </Button>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}