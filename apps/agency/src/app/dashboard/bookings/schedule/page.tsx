'use client';

import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Filter,
  Plus,
  MapPin,
  Users
} from 'lucide-react';
import { Button, Card, CardContent } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TripSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: trips } = useQuery({
    queryKey: ['agency-trips'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/trips');
      return response.data;
    }
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Flatten sessions for the calendar
  const allSessions = trips?.flatMap((trip: any) => 
    trip.sessions?.map((session: any) => ({
      ...session,
      tripTitle: trip.title,
      color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800'
    })) || []
  ) || [];

  const getSessionsForDate = (day: number) => {
    const d = new Date(year, month, day);
    return allSessions.filter((s: any) => {
      const start = new Date(s.startDate);
      return start.toDateString() === d.toDateString();
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/dashboard/bookings" className="hover:text-deep-blue">Bookings</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-semibold text-deep-blue dark:text-gray-300">Schedule</span>
          </div>
          <h1 className="text-3xl font-bold text-deep-blue dark:text-gray-100">Trip Schedule</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Operational view of your upcoming departures.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 dark:border-slate-700">
            <Filter className="h-4 w-4" /> Filter Trips
          </Button>
          <Link href="/dashboard/trips/create">
            <Button className="bg-sunset-orange hover:bg-orange-600 gap-2 border-none">
              <Plus className="h-4 w-4" /> Add Trip
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-deep-blue dark:text-blue-400">
            {MONTHS[month]} {year}
          </h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="hover:bg-gray-100 dark:hover:bg-slate-800">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="hover:bg-gray-100 dark:hover:bg-slate-800">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 text-center border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
            {DAYS.map(day => (
              <div key={day} className="py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 bg-gray-100 dark:bg-slate-800 gap-[1px]">
            {/* Pad with empty days */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[140px] bg-white dark:bg-slate-900 opacity-50"></div>
            ))}
            
            {/* Actual days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const sessions = getSessionsForDate(day);
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
              
              return (
                <div key={day} className={cn(
                  "min-h-[140px] bg-white dark:bg-slate-900 p-2 group transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-800/50",
                  isToday && "ring-1 ring-inset ring-sunset-orange bg-orange-50/10"
                )}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn(
                      "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                      isToday ? "bg-sunset-orange text-white" : "text-gray-400 group-hover:text-deep-blue dark:text-gray-500 dark:group-hover:text-gray-300"
                    )}>
                      {day}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {sessions.map((session: any) => (
                      <div 
                        key={session.id} 
                        className={cn(
                          "px-2 py-1.5 rounded-lg border text-[10px] font-bold truncate transition-all cursor-pointer hover:scale-[1.02]",
                          session.color
                        )}
                        title={`${session.tripTitle} - ${session.price} MAD`}
                      >
                        {session.tripTitle}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {/* End padding */}
            {Array.from({ length: (7 - (firstDayOfMonth + daysInMonth) % 7) % 7 }).map((_, i) => (
              <div key={`empty-end-${i}`} className="min-h-[140px] bg-white dark:bg-slate-900 opacity-50"></div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend / Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm dark:bg-slate-900">
          <CardContent className="p-6">
            <h3 className="font-bold text-deep-blue dark:text-gray-200 mb-4 flex items-center gap-2">
               <CalendarIcon className="h-5 w-5 text-sunset-orange" />
               Upcoming Highlights
            </h3>
            <div className="space-y-4">
              {allSessions.slice(0, 3).map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-700 flex flex-col items-center justify-center border dark:border-slate-600 shadow-sm">
                         <span className="text-[10px] font-bold text-sunset-orange uppercase">{new Date(session.startDate).toLocaleString('default', { month: 'short' })}</span>
                         <span className="text-sm font-bold text-deep-blue dark:text-gray-200 leading-none">{new Date(session.startDate).getDate()}</span>
                      </div>
                      <div>
                         <p className="text-sm font-bold text-deep-blue dark:text-gray-200">{session.tripTitle}</p>
                         <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Morocco • <Users className="h-3 w-3 ml-1" /> {session.availableSeats} left
                         </p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-sm font-bold text-deep-blue dark:text-gray-200">{session.price} MAD</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold uppercase">Open</span>
                   </div>
                </div>
              ))}
              {allSessions.length === 0 && <p className="text-sm text-gray-500 text-center py-4 italic">No scheduled departures yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
