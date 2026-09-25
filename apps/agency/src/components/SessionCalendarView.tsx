'use client';

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Trash2,
  Edit2,
  Users,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { Button, Card, CardContent } from '@ouiboo/ui';
import { formatCurrency, formatLocalDate } from '@ouiboo/utils';
import { SessionStatusBadge } from './SessionStatusBadge';

import type { AgencyTripSession } from './session-types';

interface SessionCalendarViewProps {
  sessions: AgencyTripSession[];
  onEdit: (session: AgencyTripSession) => void;
  onDelete: (session: AgencyTripSession) => void;
  isLoading?: boolean;
  viewMode?: 'list' | 'calendar';
}

export function SessionCalendarView({
  sessions,
  onEdit,
  onDelete,
  isLoading = false,
  viewMode = 'list'
}: SessionCalendarViewProps) {
  const { t, i18n } = useTranslation();
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Sort sessions by start date
  const sortedSessions = [...sessions].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  // Group sessions by month for calendar view
  const sessionsByMonth = sortedSessions.reduce((acc, session) => {
    const date = new Date(session.startDate);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(session);
    return acc;
  }, {} as Record<string, AgencyTripSession[]>);

  const currentMonthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
  const monthSessions = sessionsByMonth[currentMonthKey] || [];

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(currentMonth),
    [i18n.language, currentMonth],
  );

  const calculateOccupancy = (session: AgencyTripSession) => {
    const booked = session.totalSeats - session.availableSeats;
    return Math.floor((booked / session.totalSeats) * 100);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  if (viewMode === 'calendar') {
    return (
      <div className="space-y-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between bg-muted p-6 rounded-xl border border-border">
          <button
            onClick={handlePrevMonth}
            aria-label={t('common.previousMonth')}
            className="p-2 hover:bg-card rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
          </button>
          <h3 className="text-lg font-bold text-foreground">
            {monthLabel}
          </h3>
          <button
            onClick={handleNextMonth}
            aria-label={t('common.nextMonth')}
            className="p-2 hover:bg-card rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-foreground rtl:rotate-180" />
          </button>
        </div>

        {/* Month Sessions */}
        {monthSessions.length > 0 ? (
          <div className="space-y-3">
            {monthSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onEdit={onEdit}
                onDelete={onDelete}
                isExpanded={expandedSession === session.id}
                onToggleExpand={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                calculateOccupancy={calculateOccupancy}
                isLoading={isLoading}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">{t('calendar.noSessionsThisMonth')}</p>
          </div>
        )}
      </div>
    );
  }

  // List view (default)
  return (
    <div className="space-y-3">
      {sortedSessions.length > 0 ? (
        sortedSessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onEdit={onEdit}
            onDelete={onDelete}
            isExpanded={expandedSession === session.id}
            onToggleExpand={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
            calculateOccupancy={calculateOccupancy}
            isLoading={isLoading}
          />
        ))
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">{t('calendar.noSessionsYet')}</p>
          <p className="text-sm">{t('calendar.createFirstSession')}</p>
        </div>
      )}
    </div>
  );
}

interface SessionCardProps {
  session: AgencyTripSession;
  onEdit: (session: AgencyTripSession) => void;
  onDelete: (session: AgencyTripSession) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  calculateOccupancy: (session: AgencyTripSession) => number;
  isLoading?: boolean;
}

function SessionCard({
  session,
  onEdit,
  onDelete,
  isExpanded,
  onToggleExpand,
  calculateOccupancy,
  isLoading
}: SessionCardProps) {
  const { t, i18n } = useTranslation();
  const occupancy = calculateOccupancy(session);

  const formatDate = (dateString: string) =>
    formatLocalDate(dateString, i18n.language, { dateStyle: 'medium' });

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 group bg-card border border-border overflow-hidden">
      <CardContent className="p-0">
        <div
          onClick={onToggleExpand}
          className="cursor-pointer p-6 space-y-4"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Date & Status */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-bold text-lg text-foreground">
                  {formatDate(session.startDate)} - {formatDate(session.endDate)}
                </h3>
                <SessionStatusBadge status={session.status} size="sm" />
              </div>

              {/* Occupancy and Seats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-success">
                      {session.availableSeats}
                    </span>
                    {' / '}
                    {t('calendar.seatsCount', { count: session.totalSeats })}
                  </span>
                </div>

                {/* Occupancy Bar */}
                <div className="flex-1 max-w-xs h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      occupancy > 80 ? 'bg-danger' : occupancy > 50 ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ width: `${occupancy}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-medium w-12 text-end">
                  {occupancy}%
                </span>
              </div>
            </div>

            {/* Price and Actions */}
            <div className="flex items-center gap-4">
              <div className="text-end">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">{t('calendar.price')}</p>
                <p className="font-bold text-lg text-primary">
                  {formatCurrency(session.price, session.currency, i18n.language)}
                </p>
                {session.deposit > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('calendar.deposit')} {formatCurrency(session.deposit, session.currency, i18n.language)}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t('common.edit')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(session);
                  }}
                  disabled={isLoading}
                  className="text-primary hover:text-primary hover:bg-primary/10 border-primary/20"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t('common.delete')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(session);
                  }}
                  disabled={isLoading}
                  className="text-danger hover:text-danger hover:bg-danger/10 border-danger/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="border-t border-border pt-4 mt-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-2">
                    {t('calendar.startDate')}
                  </p>
                  <p className="font-semibold text-foreground">
                    {formatLocalDate(session.startDate, i18n.language, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-2">
                    {t('calendar.endDate')}
                  </p>
                  <p className="font-semibold text-foreground">
                    {formatLocalDate(session.endDate, i18n.language, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-2">
                    {t('calendar.duration')}
                  </p>
                  <p className="font-semibold text-foreground">
                    {t('calendar.daysCount', { count: Math.ceil((new Date(session.endDate).getTime() - new Date(session.startDate).getTime()) / (1000 * 60 * 60 * 24)) })}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-2">
                    {t('calendar.bookings')}
                  </p>
                  <p className="font-semibold text-foreground">
                    {t('calendar.bookingsCount', { count: session.bookings?.length || 0 })}
                  </p>
                </div>
              </div>

              {session.cancellationReason && (
                <div className="bg-danger/10 border border-danger/20 rounded-lg p-3">
                  <p className="text-xs text-danger font-medium mb-1">{t('calendar.cancellationReason')}</p>
                  <p className="text-sm text-danger/80">{session.cancellationReason}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
