'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Plus, Grid3x3, List } from 'lucide-react';
import { Button } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import { SessionCalendarView } from '@/components/SessionCalendarView';
import type { SessionItem } from './trip-detail-types';

type TripSessionsProps = {
  sessions: SessionItem[];
  viewMode: 'list' | 'calendar';
  onViewModeChange: (mode: 'list' | 'calendar') => void;
  onBulkCreate: () => void;
  isBulkCreating: boolean;
  onEditSession: (session: SessionItem) => void;
  onDeleteSession: (session: SessionItem) => void;
  isSessionMutating: boolean;
};

export function TripSessions({
  sessions,
  viewMode,
  onViewModeChange,
  onBulkCreate,
  isBulkCreating,
  onEditSession,
  onDeleteSession,
  isSessionMutating,
}: TripSessionsProps) {
  const { t } = useTranslation();

  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-accent" />
            {t('trips.detail.sessionsTitle')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('trips.detail.sessionsSubtitle')}</p>
        </div>
      </div>

      {/* Session Management Toolbar */}
      <div className="flex items-center gap-3">
        <Button
          onClick={onBulkCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-lg shadow-primary/20 flex-1"
          disabled={isBulkCreating}
        >
          <Plus className="h-4 w-4" /> {t('trips.detail.bulkCreateSessions')}
        </Button>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            aria-label={t('trips.detail.listView')}
            aria-pressed={viewMode === 'list'}
            className={cn(
              'p-2 rounded transition-colors',
              viewMode === 'list'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('calendar')}
            aria-label={t('trips.detail.calendarView')}
            aria-pressed={viewMode === 'calendar'}
            className={cn(
              'p-2 rounded transition-colors',
              viewMode === 'calendar'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sessions View */}
      <SessionCalendarView
        sessions={sessions}
        onEdit={onEditSession}
        onDelete={onDeleteSession}
        isLoading={isSessionMutating}
        viewMode={viewMode}
      />
    </div>
  );
}
