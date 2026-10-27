'use client';

import React from 'react';
import Image from 'next/image';
import { isSharingEnabled, scrubShareClaimWords } from '@ouiboo/utils';
import type { AdminTrip } from './types';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type SharePreviewCardProps = {
  t: TFn;
  trip: Pick<AdminTrip, 'id' | 'title' | 'images'> & { description?: string | null };
};

/**
 * #561 (Council S3 P1-3): admin preview of the public trip link preview
 * (OG card + share text) for one trip, visible before the sharing flag is
 * ever set in production. Title/description pass through the same
 * claim-word scrubber the traveller metadata uses (#468), so what the
 * admin sees here is what a social preview would carry at launch.
 * While sharing is off, the live public preview is the generic Ouiboo
 * card — the card below is labelled as the at-launch preview.
 */
export default function SharePreviewCard({ t, trip }: SharePreviewCardProps) {
  const sharingEnabled = isSharingEnabled();
  const title = scrubShareClaimWords(trip.title || '');
  const description = trip.description ? scrubShareClaimWords(trip.description) : '';
  const shareText = t('dashboard.sharePreview.shareText', { title });
  const image = trip.images?.[0];

  return (
    <div data-testid="share-preview-card" className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3 text-start">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {t('dashboard.sharePreview.title')}
      </p>
      <p className="text-xs text-muted-foreground">
        {sharingEnabled ? t('dashboard.sharePreview.liveNote') : t('dashboard.sharePreview.gatedNote')}
      </p>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {image && (
          <div className="relative h-28">
            <Image src={image} alt={title} fill sizes="(min-width: 1024px) 25vw, 100vw" className="object-cover" />
          </div>
        )}
        <div className="p-3 space-y-1">
          <p className="text-sm font-bold text-foreground line-clamp-1">{title || 'Ouiboo'}</p>
          {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
          <p className="text-xs text-muted-foreground break-all">/trip/{trip.id}?src=share</p>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {t('dashboard.sharePreview.shareTextLabel')}
        </p>
        <p className="text-xs text-foreground">{shareText}</p>
      </div>
    </div>
  );
}
