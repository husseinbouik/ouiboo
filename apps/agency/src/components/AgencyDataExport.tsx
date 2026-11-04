'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ouiboo/ui';
import { Download } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export type AgencyExportKind = 'bookings' | 'trips' | 'reviews';

const EXPORT_KINDS: AgencyExportKind[] = ['bookings', 'trips', 'reviews'];

const filenameFromDisposition = (disposition: string | undefined, kind: AgencyExportKind) => {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? `ouiboo-${kind}.csv`;
};

/**
 * #780 (Council S6 Phase 3): self-serve CSV export of the agency's OWN
 * bookings, trips and reviews. The API scopes every export by the
 * authenticated agency (tenant isolation server-side); this control only
 * triggers the download with the agency session via apiClient.
 */
export function AgencyDataExport() {
  const { t } = useTranslation();
  const [busyKind, setBusyKind] = useState<AgencyExportKind | null>(null);
  const [failed, setFailed] = useState(false);

  const download = async (kind: AgencyExportKind) => {
    setBusyKind(kind);
    setFailed(false);
    try {
      const response = await apiClient.get(`/agency/exports/${kind}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filenameFromDisposition(
        response.headers?.['content-disposition'],
        kind,
      );
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setFailed(true);
    } finally {
      setBusyKind(null);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('exportData.title')}>
        {EXPORT_KINDS.map((kind) => (
          <Button
            key={kind}
            type="button"
            variant="outline"
            className="gap-2"
            disabled={busyKind !== null}
            onClick={() => download(kind)}
          >
            <Download className="h-4 w-4" /> {t(`exportData.${kind}`)}
          </Button>
        ))}
      </div>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {t('exportData.error')}
        </p>
      )}
    </div>
  );
}
