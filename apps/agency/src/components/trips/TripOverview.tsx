'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, Badge, SafeImage } from '@ouiboo/ui';
import type { TripDetail } from './trip-detail-types';
import { useAuth } from '@/components/AuthContext';
import {
  activationBlockMessageKey,
  getAgencyActivationState,
} from '@/lib/agency-verification';

type TripOverviewProps = {
  trip: TripDetail;
};

export function TripOverview({ trip }: TripOverviewProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  // #415: the banner reflects the real activation gate — it renders only
  // when publishing/activating payments is actually blocked, names the
  // blocking artefact, and never claims live trips are hidden (existing
  // ACTIVE trips are never retroactively blocked).
  const activation = getAgencyActivationState(user?.agencyProfile);

  return (
    <div className="lg:col-span-1 space-y-6">
      <Card className="border border-border shadow-sm overflow-hidden bg-card">
        <div className="h-48 bg-muted">
          <SafeImage src={trip.images?.[0] || "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?q=80&w=2070&auto=format&fit=crop"} alt={trip.imageAlts?.[0]?.trim() || t('trips.detail.altTrip')} className="w-full h-full object-cover" fallbackClassName="w-full h-full" width={800} height={400} />
        </div>
        <CardContent className="p-6 space-y-4">
          <div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-accent border-accent/20 mb-2">{trip.category}</Badge>
            <h1 className="text-2xl font-bold text-foreground">{trip.title}</h1>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-muted-foreground" /> {trip.startLocation}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" /> {t('trips.detail.durationDays', { count: trip.durationDays })} / {t('trips.detail.durationNights', { count: trip.durationNights })}
            </div>
          </div>
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground leading-relaxed italic line-clamp-3">
              {trip.description}
            </p>
          </div>
        </CardContent>
      </Card>

      {activation.block && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold">
            <AlertCircle className="h-5 w-5" />
            <span>{t('trips.detail.verificationRequired')}</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(activationBlockMessageKey(activation.block))}{' '}
            {t('trips.detail.activationBlockedBody')}
          </p>
          <Link href="/dashboard/onboarding" className="inline-block text-sm font-bold text-primary underline mt-2">
            {t('trips.detail.checkVerificationStatus')}
          </Link>
        </div>
      )}
    </div>
  );
}
