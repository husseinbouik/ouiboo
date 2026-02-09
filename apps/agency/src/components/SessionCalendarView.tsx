'use client';

import React, { useState } from 'react';
import {
  MoreVertical,
  Trash2,
  Edit2,
  Users,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { Button, Card, CardContent } from '@ouiboo/ui';
import { SessionStatusBadge } from './SessionStatusBadge';

interface Session {
  id: string;
  startDate: string;
  endDate: string;
  price: number;
  deposit: number;
  totalSeats: number;
  availableSeats: number;
  status: 'OPEN' | 'FULL' | 'CANCELLED';
  currency: string;
  cancellationReason?: string | null;
  bookings?: any[];
}

interface SessionCalendarViewProps {
  sessions: Session[];
  onEdit: (session: Session) => void;
  onDelete: (session: Session) => void;
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
  }, {} as Record<string, Session[]>);

  const currentMonthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
  const monthSessions = sessionsByMonth[currentMonthKey] || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateOccupancy = (session: Session) => {
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
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-950 p-6 rounded-xl border border-blue-100 dark:border-slate-800">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-deep-blue dark:text-gray-300" />
          </button>
          <h3 className="text-lg font-bold text-deep-blue dark:text-gray-100">
            {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-deep-blue dark:text-gray-300" />
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
                formatDate={formatDate}
                isLoading={isLoading}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No sessions scheduled for this month</p>
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
            formatDate={formatDate}
            isLoading={isLoading}
          />
        ))
      ) : (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No sessions scheduled yet</p>
          <p className="text-sm">Create your first session to get started</p>
        </div>
      )}
    </div>
  );
}

interface SessionCardProps {
  session: Session;
  onEdit: (session: Session) => void;
  onDelete: (session: Session) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  calculateOccupancy: (session: Session) => number;
  formatDate: (date: string) => string;
  isLoading?: boolean;
}

function SessionCard({
  session,
  onEdit,
  onDelete,
  isExpanded,
  onToggleExpand,
  calculateOccupancy,
  formatDate,
  isLoading
}: SessionCardProps) {
  const occupancy = calculateOccupancy(session);

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 group dark:bg-slate-900 border dark:border-slate-800 overflow-hidden">
      <CardContent className="p-0">
        <div
          onClick={onToggleExpand}
          className="cursor-pointer p-6 space-y-4"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Date & Status */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-bold text-lg text-deep-blue dark:text-gray-100">
                  {formatDate(session.startDate)} - {formatDate(session.endDate)}
                </h3>
                <SessionStatusBadge status={session.status} size="sm" />
              </div>

              {/* Occupancy and Seats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-500">
                      {session.availableSeats}
                    </span>
                    {' / '}
                    {session.totalSeats} seats
                  </span>
                </div>

                {/* Occupancy Bar */}
                <div className="flex-1 max-w-xs h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      occupancy > 80 ? 'bg-red-500' : occupancy > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${occupancy}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium w-12 text-right">
                  {occupancy}%
                </span>
              </div>
            </div>

            {/* Price and Actions */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-tighter">Price</p>
                <p className="font-bold text-lg text-deep-blue dark:text-blue-400">
                  {session.price.toLocaleString()} <span className="text-xs font-normal">{session.currency}</span>
                </p>
                {session.deposit > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Deposit: {session.deposit} {session.currency}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(session);
                  }}
                  disabled={isLoading}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 border-blue-200 dark:border-blue-900/30"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(session);
                  }}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/30"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="border-t border-gray-100 dark:border-slate-800 pt-4 mt-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest mb-2">
                    Start Date
                  </p>
                  <p className="font-semibold text-deep-blue dark:text-gray-100">
                    {new Date(session.startDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest mb-2">
                    End Date
                  </p>
                  <p className="font-semibold text-deep-blue dark:text-gray-100">
                    {new Date(session.endDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest mb-2">
                    Duration
                  </p>
                  <p className="font-semibold text-deep-blue dark:text-gray-100">
                    {Math.ceil((new Date(session.endDate).getTime() - new Date(session.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest mb-2">
                    Bookings
                  </p>
                  <p className="font-semibold text-deep-blue dark:text-gray-100">
                    {session.bookings?.length || 0} bookings
                  </p>
                </div>
              </div>

              {session.cancellationReason && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Cancellation Reason</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{session.cancellationReason}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
