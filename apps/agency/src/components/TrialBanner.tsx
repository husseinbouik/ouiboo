'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { X, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import { useRouter } from 'next/navigation';

export function TrialBanner() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Only show if user is Agency and in Trial
    if (user?.role === 'AGENCY' && user?.agencyProfile?.subscriptionStatus === 'TRIAL' && user?.agencyProfile?.trialEndsAt) {
      const dismissed = localStorage.getItem('trial_banner_dismissed');
      if (dismissed !== 'true') {
        setIsVisible(true);
      }
    }
  }, [user]);

  if (!isVisible || !user?.agencyProfile?.trialEndsAt) return null;

  const calculateDaysLeft = (endsAt: string | Date): number => {
    const end = new Date(endsAt).getTime();
    const now = new Date().getTime();
    return Math.ceil((end - now) / (1000 * 3600 * 24));
  };

  const daysLeft = calculateDaysLeft(user.agencyProfile.trialEndsAt);
  const isUrgent = daysLeft <= 3;

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('trial_banner_dismissed', 'true');
  };

  return (
    <div className={cn(
      "fixed bottom-4 right-4 left-4 md:left-auto md:w-[400px] z-50 transition-all duration-300 transform translate-y-0",
      isUrgent ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200",
      "border rounded-xl shadow-lg p-4"
    )}>
      <div className="flex items-start gap-3">
        {isUrgent ? (
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
        ) : (
          <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
        )}
        <div className="flex-1">
          <h4 className={cn("font-semibold text-sm", isUrgent ? "text-red-900" : "text-blue-900")}>
            Free Trial Ending Soon
          </h4>
          <p className={cn("text-xs mt-1 leading-relaxed", isUrgent ? "text-red-700" : "text-blue-700")}>
            You have <span className="font-bold">{Math.max(0, daysLeft)} days</span> remaining in your free trial. 
            {isUrgent ? ' Upgrade now to avoid interruption.' : ' meaningful features await.'}
          </p>
          <Button 
            size="sm" 
            className={cn("mt-3 w-full h-8 text-xs", isUrgent ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700")}
            onClick={() => router.push('/dashboard/settings/billing')}
          >
            Upgrade Plan
          </Button>
        </div>
        <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
