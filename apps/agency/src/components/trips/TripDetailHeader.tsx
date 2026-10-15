'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Settings, Trash, CheckCircle2 } from 'lucide-react';
import { Button } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import { TripStatus, type TripStatusType } from '@ouiboo/types';

type TripDetailHeaderProps = {
  tripId: string;
  tripStatus: TripStatusType;
  isDeleting: boolean;
  isArchiving: boolean;
  isDeactivating: boolean;
  isActivating: boolean;
  isRestoring: boolean;
  onDelete: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onRestore: () => void;
};

export function TripDetailHeader({
  tripId,
  tripStatus,
  isDeleting,
  isArchiving,
  isDeactivating,
  isActivating,
  isRestoring,
  onDelete,
  onDeactivate,
  onActivate,
  onRestore,
}: TripDetailHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <Link href="/dashboard/trips" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        {t('trips.detail.backToTrips')}
      </Link>
      <div className="flex gap-2 flex-wrap">
        {/* Deactivate/Activate toggle - always safe, keeps bookings */}
        {(tripStatus === TripStatus.Active || tripStatus === TripStatus.Inactive) && (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2",
              tripStatus === TripStatus.Active ? "text-success border-success/30 bg-success/10" : "text-muted-foreground border-border bg-muted/50"
            )}
            onClick={() => {
              if (tripStatus === TripStatus.Active) {
                onDeactivate();
              } else {
                onActivate();
              }
            }}
            disabled={isDeactivating || isActivating}
          >
            <CheckCircle2 className="h-4 w-4" />
            {tripStatus === TripStatus.Active ? t('trips.detail.deactivate') : t('trips.detail.activateTrip')}
          </Button>
        )}
        {/* Restore button for archived trips */}
        {tripStatus === TripStatus.Archived && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-success border-success/30 bg-success/10"
            onClick={onRestore}
            disabled={isRestoring}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isRestoring ? t('trips.detail.restoring') : t('trips.detail.restore')}
          </Button>
        )}
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href={`/dashboard/trips/${tripId}/edit`}><Settings className="h-4 w-4" /> {t('trips.detail.editTemplate')}</Link>
        </Button>
        {/* Archive for published trips, hard delete only for untouched drafts */}
        {tripStatus !== TripStatus.Archived && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-danger hover:bg-danger/10 hover:text-danger border-danger/30"
            onClick={onDelete}
            disabled={isDeleting || isArchiving}
          >
            <Trash className="h-4 w-4" />
            {tripStatus === TripStatus.Draft
              ? (isDeleting ? t('trips.detail.deleting') : t('trips.detail.delete'))
              : (isArchiving ? t('trips.detail.archiving') : t('trips.detail.archive'))}
          </Button>
        )}
      </div>
    </div>
  );
}
