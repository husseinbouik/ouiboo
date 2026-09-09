'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  MapPin, 
  Clock, 
  ChevronLeft,
  Settings,
  Trash,
  CheckCircle2,
  AlertCircle,
  Grid3x3,
  List
} from 'lucide-react';
import { 
  Button, 
  Card, 
  CardContent, 
  Badge
} from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { BulkSessionCreationModal } from '@/components/BulkSessionCreationModal';
import { SessionCalendarView } from '@/components/SessionCalendarView';
import { EditSessionModal } from '@/components/EditSessionModal';
import { DeleteConfirmation } from '@/components/DeleteConfirmation';
import { TripStatus, type TripStatusType } from '@ouiboo/types';
import type { AgencyTripSession } from '@/components/session-types';

type SessionItem = AgencyTripSession;

type TripDetail = {
  id: string;
  title: string;
  category: string;
  status: TripStatusType;
  currency: string;
  startLocation: string;
  durationDays: number;
  durationNights: number;
  description: string;
  images?: string[];
  sessions?: SessionItem[];
};

type BulkSessionInput = {
  startDate: string;
  endDate: string;
  price: number;
  deposit?: number;
  totalSeats: number;
  currency: string;
};

function TripDetailSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-slate-800 rounded"></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="h-96 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
        <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
      </div>
    </div>
  );
}

export default function TripDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  const [showBulkSessionModal, setShowBulkSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionItem | null>(null);
  const [deletingSession, setDeletingSession] = useState<SessionItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: trip, isLoading, error } = useQuery<TripDetail>({
    queryKey: ['trip', params.id],
    queryFn: async () => {
      const response = await apiClient.get(`/agency/trips/${params.id}`);
      return response.data;
    }
  });

  const deleteTripMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/trips/${params.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
      router.push('/dashboard/trips');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: TripStatusType) => {
      await apiClient.patch(`/trips/${params.id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', params.id] });
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
    }
  });

  // Bulk session creation
  const bulkCreateSessionMutation = useMutation({
    mutationFn: async (sessions: BulkSessionInput[]) => {
      const results = await Promise.all(
        sessions.map(session =>
          apiClient.post(`/trips/${params.id}/sessions`, {
            startDate: session.startDate,
            endDate: session.endDate,
            price: session.price,
            deposit: session.deposit || 0,
            totalSeats: session.totalSeats,
            currency: session.currency
          })
        )
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', params.id] });
      setShowBulkSessionModal(false);
    }
  });

  // Edit session
  const editSessionMutation = useMutation({
    mutationFn: async (data: Partial<SessionItem>) => {
      if (!editingSession) {
        throw new Error('No session selected for editing');
      }
      await apiClient.patch(`/trips/${params.id}/sessions/${editingSession.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', params.id] });
      setEditingSession(null);
    }
  });

  // Delete session
  const deleteSessionMutation = useMutation({
    mutationFn: async () => {
      if (!deletingSession) {
        throw new Error('No session selected for deletion');
      }
      await apiClient.delete(`/trips/${params.id}/sessions/${deletingSession.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', params.id] });
      setDeletingSession(null);
      setDeleteConfirmOpen(false);
    }
  });

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const handleToggleStatus = () => {
    if (!trip) return;
    const newStatus = trip.status === TripStatus.Active ? TripStatus.Draft : TripStatus.Active;
    updateStatusMutation.mutate(newStatus);
  };

  const handleEditSession = (session: SessionItem) => {
    setEditingSession(session);
  };

  const handleDeleteSession = (session: SessionItem) => {
    setDeletingSession(session);
    setDeleteConfirmOpen(true);
  };

  const handleEditSessionSubmit = (data: Partial<SessionItem>) => {
    editSessionMutation.mutate(data);
  };

  if (isLoading) return <TripDetailSkeleton />;
  if (error || !trip) return <div className="py-12 text-center text-red-500">Error loading trip.</div>;

  const sessions = trip.sessions || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/trips" className="flex items-center gap-2 text-sm text-gray-500 hover:text-deep-blue transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Trips
        </Link>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
                "gap-2",
                trip.status === TripStatus.Active ? "text-emerald-600 border-emerald-100 bg-emerald-50/50" : "text-slate-600 border-slate-100 bg-slate-50/50"
            )}
            onClick={handleToggleStatus}
            disabled={updateStatusMutation.isPending}
          >
            <CheckCircle2 className="h-4 w-4" /> 
            {updateStatusMutation.isPending ? 'Updating...' : (trip.status === TripStatus.Active ? 'Set to Draft' : 'Activate Trip')}
          </Button>
          <Link href={`/dashboard/trips/${params.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" /> Edit Template
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100"
            onClick={handleDelete}
            disabled={deleteTripMutation.isPending}
          >
            <Trash className="h-4 w-4" /> {deleteTripMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trip Template Overview */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-sm overflow-hidden dark:bg-slate-900 border dark:border-slate-800">
             <div className="h-48 bg-gray-200 dark:bg-slate-800">
                <Image src={trip.images?.[0] || "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?q=80&w=2070&auto=format&fit=crop"} alt="Trip" className="w-full h-full object-cover" width={800} height={400} />
             </div>
             <CardContent className="p-6 space-y-4">
                <div>
                   <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-sunset-orange border-sunset-orange/20 mb-2">{trip.category}</Badge>
                   <h1 className="text-2xl font-bold text-deep-blue dark:text-gray-100">{trip.title}</h1>
                </div>
                <div className="space-y-3">
                   <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="h-4 w-4 text-gray-400" /> {trip.startLocation}
                   </div>
                   <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4 text-gray-400" /> {trip.durationDays} Days / {trip.durationNights} Nights
                   </div>
                </div>
                <div className="pt-4 border-t border-gray-50 dark:border-slate-800">
                   <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed italic line-clamp-3">
                      {trip.description}
                   </p>
                </div>
             </CardContent>
          </Card>
          
          <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl p-6 space-y-2">
             <div className="flex items-center gap-2 text-blue-900 dark:text-blue-400 font-bold">
                <AlertCircle className="h-5 w-5" />
                <span>Verification Required</span>
             </div>
             <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                Your agency verification is pending. You can create templates and sessions, but they will not be visible to travelers until your profile is verified.
             </p>
             <Link href="/dashboard/onboarding" className="inline-block text-sm font-bold text-blue-900 dark:text-blue-400 underline mt-2">
                Check Verification Status
             </Link>
          </div>
        </div>

        {/* Scheduler / Sessions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold text-deep-blue dark:text-gray-100 flex items-center gap-2">
                 <CalendarIcon className="h-5 w-5 text-sunset-orange" />
                 Trip Sessions
              </h2>
              <p className="text-sm text-gray-500 mt-1">Manage dates, prices, and capacity for your trip.</p>
            </div>
          </div>

          {/* Session Management Toolbar */}
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setShowBulkSessionModal(true)} 
              className="bg-deep-blue hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 gap-2 shadow-lg shadow-blue-900/10 flex-1"
              disabled={bulkCreateSessionMutation.isPending}
            >
              <Plus className="h-4 w-4" /> Bulk Create Sessions
            </Button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded transition-colors',
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-deep-blue dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={cn(
                  'p-2 rounded transition-colors',
                  viewMode === 'calendar'
                    ? 'bg-white dark:bg-slate-900 text-deep-blue dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                )}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Sessions View */}
          <SessionCalendarView
            sessions={sessions}
            onEdit={handleEditSession}
            onDelete={handleDeleteSession}
            isLoading={editSessionMutation.isPending || deleteSessionMutation.isPending}
            viewMode={viewMode}
          />
        </div>
      </div>

      {/* Bulk Session Creation Modal */}
      <BulkSessionCreationModal
        isOpen={showBulkSessionModal}
        onClose={() => setShowBulkSessionModal(false)}
        onSubmit={(sessions) => bulkCreateSessionMutation.mutate(sessions)}
        isLoading={bulkCreateSessionMutation.isPending}
        currency={trip?.currency ?? 'MAD'}
      />

      {/* Edit Session Modal */}
      <EditSessionModal
        isOpen={!!editingSession}
        session={editingSession ?? undefined}
        onClose={() => setEditingSession(null)}
        onSubmit={handleEditSessionSubmit}
        isLoading={editSessionMutation.isPending}
        isDelete={false}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmation 
        isOpen={Boolean(deleteConfirmOpen && deletingSession)}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingSession(null);
        }}
        onConfirm={() => {
          if (deletingSession) {
            deleteSessionMutation.mutate();
          }
        }}
        isLoading={deleteSessionMutation.isPending}
        title="Delete Session"
        description="Are you sure you want to delete this session? This action cannot be undone."
      />

      {/* Delete Trip Confirmation */}
      <DeleteConfirmation 
        isOpen={Boolean(deleteConfirmOpen && !deletingSession)}
        onClose={() => {
          setDeleteConfirmOpen(false);
        }}
        onConfirm={() => {
          deleteTripMutation.mutate();
        }}
        isLoading={deleteTripMutation.isPending}
        title="Delete Trip Template"
        description="Are you sure you want to delete this trip template? All associated sessions and bookings will be permanently removed. This action cannot be undone."
      />
    </div>
  );
}
