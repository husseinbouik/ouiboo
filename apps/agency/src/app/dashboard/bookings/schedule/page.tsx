'use client';

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Users,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button, Card, CardContent } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatLocalDate } from '@ouiboo/utils';

type ScheduleSession = {
  id: string;
  startDate: string;
  endDate: string;
  price: number;
  currency: string;
  availableSeats: number;
};

type ScheduleTrip = {
  id: string;
  title: string;
  sessions?: ScheduleSession[];
};

type CalendarSession = ScheduleSession & {
  tripId: string;
  tripTitle: string;
  color: string;
};

export default function TripSchedulePage() {
  const { t, i18n } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTripId, setSelectedTripId] = useState('ALL');

  const { data: trips = [] } = useQuery<ScheduleTrip[]>({
    queryKey: ['agency-trips'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/trips');
      return response.data;
    },
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weekdays = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(2024, 0, 7 + index)));
  }, [i18n.language]);

  const monthLabel = new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));

  const visibleTrips = useMemo(
    () => (selectedTripId === 'ALL' ? trips : trips.filter((trip) => trip.id === selectedTripId)),
    [selectedTripId, trips],
  );

  const allSessions: CalendarSession[] = useMemo(
    () => visibleTrips
      .flatMap((trip) =>
        (trip.sessions || []).map((session) => ({
          ...session,
          tripId: trip.id,
          tripTitle: trip.title,
          color: 'bg-primary/10 text-primary border-primary/20',
        })),
      )
      .sort((left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime()),
    [visibleTrips],
  );

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getSessionsForDate = (day: number) => {
    const targetDate = new Date(year, month, day);
    return allSessions.filter((session) => new Date(session.startDate).toDateString() === targetDate.toDateString());
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard/bookings" className="hover:text-foreground">{t('bookings.title')}</Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="font-semibold text-foreground">{t('bookings.schedule.title')}</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{t('bookings.schedule.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('bookings.schedule.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTripId}
            onChange={(event) => setSelectedTripId(event.target.value)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors focus:border-primary focus:outline-none"
            aria-label={t('bookings.schedule.filterByTrip')}
          >
            <option value="ALL">{t('bookings.schedule.allTrips')}</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.title}
              </option>
            ))}
          </select>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 border-none">
              <Link href="/dashboard/trips/create"><Plus className="h-4 w-4" /> {t('bookings.schedule.addTrip')}</Link>
            </Button>
        </div>
      </div>

      <Card className="shadow-sm bg-card border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            {monthLabel}
          </h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={prevMonth} aria-label={t('common.previousMonth')} className="hover:bg-muted">
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} aria-label={t('common.nextMonth')} className="hover:bg-muted">
              <ChevronRight className="h-5 w-5 rtl:rotate-180" />
            </Button>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 text-center border-b border-border bg-muted/50">
            {weekdays.map((day) => (
              <div key={day} className="py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 bg-border gap-[1px]">
            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div key={`empty-${index}`} className="min-h-[140px] bg-card opacity-50" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const sessions = getSessionsForDate(day);
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

              return (
                <div
                  key={day}
                  className={cn(
                    'min-h-[140px] bg-card p-2 group transition-colors hover:bg-muted/50',
                    isToday && 'ring-1 ring-inset ring-accent bg-accent/5',
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={cn(
                        'text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors',
                        isToday ? 'bg-accent text-accent-foreground' : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    >
                      {day}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {sessions.map((session) => (
                      <Link
                        key={session.id}
                        href={`/dashboard/trips/${session.tripId}`}
                        className={cn(
                          'block px-2 py-1.5 rounded-lg border text-[10px] font-bold truncate transition-all hover:scale-[1.02]',
                          session.color,
                        )}
                        title={`${session.tripTitle} - ${formatCurrency(session.price, session.currency, i18n.language)}`}
                      >
                        {session.tripTitle}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}

            {Array.from({ length: (7 - (firstDayOfMonth + daysInMonth) % 7) % 7 }).map((_, index) => (
              <div key={`empty-end-${index}`} className="min-h-[140px] bg-card opacity-50" />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm bg-card border border-border">
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-accent" />
              {t('bookings.schedule.upcomingHighlights')}
            </h3>
            <div className="space-y-4">
              {allSessions.slice(0, 3).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-muted rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-card flex flex-col items-center justify-center border border-border shadow-sm">
                      <span className="text-[10px] font-bold text-accent uppercase">
                        {formatLocalDate(session.startDate, i18n.language, { month: 'short' })}
                      </span>
                      <span className="text-sm font-bold text-foreground leading-none">
                        {formatLocalDate(session.startDate, i18n.language, { day: 'numeric' })}
                      </span>
                    </div>
                    <div>
                      <Link href={`/dashboard/trips/${session.tripId}`} className="text-sm font-bold text-foreground hover:underline">
                        {session.tripTitle}
                      </Link>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {t('bookings.schedule.region')} • <Users className="h-3 w-3 ms-1" /> {t('bookings.schedule.seatsLeft', { count: session.availableSeats })}
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(session.price, session.currency, i18n.language)}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-bold uppercase">{t('bookings.schedule.openBadge')}</span>
                  </div>
                </div>
              ))}
              {allSessions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 italic">
                  {selectedTripId === 'ALL' ? t('bookings.schedule.noSessions') : t('bookings.schedule.noMatches')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
