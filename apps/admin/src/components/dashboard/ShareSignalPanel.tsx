'use client';

import React from 'react';
import { Share2 } from 'lucide-react';
import { isSharingEnabled } from '@ouiboo/utils';
import type { AdminTrip } from './types';
import SharePreviewCard from './SharePreviewCard';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type ShareSignalPanelProps = {
  t: TFn;
  /** Trips currently in the verification queue (may be empty). */
  trips: Array<Pick<AdminTrip, 'id' | 'title' | 'images'> & { description?: string | null }>;
};

/**
 * #561 rework: the always-rendered admin share-signal surface.
 *
 * PR #598 put the OG preview behind a per-trip toggle in the
 * verification queue — which renders NOTHING when the queue holds no
 * DRAFT trips (the normal state on staging, where trips are already
 * ACTIVE), so the deployed admin showed no share surface in any
 * section. This panel is rendered unconditionally at the top of the
 * verification queue: it states this admin build's sharing state
 * honestly (the founder set sharing ON for staging traveller + agency
 * only, so the admin build reading "off" is expected and labelled as
 * this build's state, not the platform's), and it expands the per-trip
 * OG preview for every queued trip. When the queue is empty it says so
 * instead of disappearing.
 */
export default function ShareSignalPanel({ t, trips }: ShareSignalPanelProps) {
  const sharingEnabled = isSharingEnabled();
  const [previewTripId, setPreviewTripId] = React.useState<string | null>(null);
  return (
    <section data-testid="share-signal-panel" className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Share2 className="h-5 w-5 text-sunset-orange" />
        {t('dashboard.sharePreview.panelTitle')}
      </h2>
      <p className="text-sm text-muted-foreground">
        {sharingEnabled ? t('dashboard.sharePreview.panelLive') : t('dashboard.sharePreview.panelGated')}
      </p>
      <p className="text-xs text-muted-foreground">{t('dashboard.sharePreview.panelAdminNote')}</p>
      {trips.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dashboard.sharePreview.panelEmpty')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {trips.map((trip) => (
            <div key={trip.id} className="space-y-2">
              <button
                type="button"
                className="w-full text-start rounded-xl border border-border px-4 py-3 text-sm font-bold text-foreground hover:bg-muted/50"
                onClick={() => setPreviewTripId(previewTripId === trip.id ? null : trip.id)}
                aria-expanded={previewTripId === trip.id}
              >
                {trip.title}
              </button>
              {previewTripId === trip.id && <SharePreviewCard t={t} trip={trip} />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
