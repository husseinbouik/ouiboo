'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, SafeImage } from '@ouiboo/ui';
import {
  buildSharePayload,
  isSharingEnabled,
  resolveShareBaseUrl,
  scrubShareClaimWords,
} from '@ouiboo/utils';
import { TRAVELER_URL } from '@/lib/site';
import type { TripDetail } from './trip-detail-types';

/**
 * #561 (Council S3 P1-3): agency-visible preview of the public trip link
 * preview — the exact OG card + share text this trip will carry. Title
 * and description pass through the same claim-word scrubber as the
 * traveller page metadata (#468), and the URL is built by the same
 * share-payload builder as the share button, so the preview cannot drift
 * from what social apps will render at launch. While the B12 sharing
 * gate is off, the live public preview is the generic Ouiboo card; this
 * surface is labelled as the at-launch preview.
 */
export function SharePreviewCard({ trip }: { trip: Pick<TripDetail, 'id' | 'title' | 'description' | 'images'> }) {
  const { t } = useTranslation();
  const sharingEnabled = isSharingEnabled();
  const shareBaseUrl = resolveShareBaseUrl(TRAVELER_URL, {
    runtimeOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
  });
  const title = scrubShareClaimWords(trip.title || '');
  const description = trip.description ? scrubShareClaimWords(trip.description) : '';
  const payload = shareBaseUrl
    ? buildSharePayload({
        travelerBaseUrl: shareBaseUrl,
        tripId: trip.id,
        tripTitle: trip.title,
        textTemplate: t('share.text'),
        source: 'agency-share',
      })
    : null;
  const cover = trip.images?.[0];

  return (
    <Card data-testid="share-preview-card" className="border border-border shadow-sm bg-card overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">{t('sharePreview.title')}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {sharingEnabled ? t('sharePreview.liveNote') : t('sharePreview.gatedNote')}
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          {cover && (
            <div className="relative h-36 bg-muted">
              <SafeImage src={cover} alt={title} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
            </div>
          )}
          <div className="p-4 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ouiboo</p>
            <p className="font-bold text-foreground line-clamp-1">{title || 'Ouiboo'}</p>
            {description && <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>}
            {payload && <p className="text-xs text-muted-foreground break-all">{payload.url}</p>}
          </div>
        </div>
        {payload && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t('sharePreview.shareTextLabel')}
            </p>
            <p className="text-sm text-foreground mt-1">{payload.text}</p>
          </div>
        )}
        {!payload && <p className="text-xs text-muted-foreground">{t('sharePreview.noPublicBase')}</p>}
      </CardContent>
    </Card>
  );
}
