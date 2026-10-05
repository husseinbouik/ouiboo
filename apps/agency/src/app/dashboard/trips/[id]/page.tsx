'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
      <div className="h-8 w-48 bg-muted rounded"></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="h-96 bg-muted rounded-xl"></div>
        <div className="lg:col-span-2 h-96 bg-muted rounded-xl"></div>
      </div>
    </div>
  );
}

export default function TripDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  const { t } = useTranslation();
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
      // Drafts: hard delete. Published trips: archive (preserves records).
      if (trip?.status === TripStatus.Draft) {
        await apiClient.delete(`/trips/${params.id}`);
      } else {
        await apiClient.post(`/trips/${params.id}/archive`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
      router.push('/dashboard/trips');
    },
    onError: (error: unknown) => {
      // Show the API's helpful message (e.g. active bookings block)
      const apiError = error as { response?: { data?: { message?: string } } };
      const message = apiError.response?.data?.message;
      if (message) {
        // The confirmation dialog will show this via a toast or alert
        // For now, surface via the existing error handling
        console.error('Archive failed:', message);
      }
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
    // Toggle between Active and Inactive (deactivate = hide from marketplace, keep bookings)
    const newStatus = trip.status === TripStatus.Active ? TripStatus.Inactive : TripStatus.Active;
    updateStatusMutation.mutate(newStatus);
  };

  const archiveTripMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/trips/${params.id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', params.id] });
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
    }
  });

  const restoreTripMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/trips/${params.id}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', params.id] });
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
    }
  });

  const deactivateTripMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/trips/${params.id}/deactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', params.id] });
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
    }
  });

  const activateTripMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/trips/${params.id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', params.id] });
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
    }
  });

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
  if (error || !trip) return <div className="py-12 text-center text-danger">{t('trips.detail.errorLoading')}</div>;

  const sessions = trip.sessions || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link href="/dashboard/trips" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {t('trips.detail.backToTrips')}
        </Link>
        <div className="flex gap-2 flex-wrap">
          {/* Deactivate/Activate toggle - always safe, keeps bookings */}
          {(trip.status === TripStatus.Active || trip.status === TripStatus.Inactive) && (
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                  "gap-2",
                  trip.status === TripStatus.Active ? "text-success border-success/30 bg-success/10" : "text-muted-foreground border-border bg-muted/50"
              )}
              onClick={() => {
                if (trip.status === TripStatus.Active) {
                  deactivateTripMutation.mutate();
                } else {
                  activateTripMutation.mutate();
                }
              }}
              disabled={deactivateTripMutation.isPending || activateTripMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" /> 
              {trip.status === TripStatus.Active ? t('trips.detail.deactivate') : t('trips.detail.activateTrip')}
            </Button>
          )}
          {/* Restore button for archived trips */}
          {trip.status === TripStatus.Archived && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-success border-success/30 bg-success/10"
              onClick={() => restoreTripMutation.mutate()}
              disabled={restoreTripMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" /> 
              {restoreTripMutation.isPending ? t('trips.detail.restoring') : t('trips.detail.restore')}
            </Button>
          )}
          <Link href={`/dashboard/trips/${params.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" /> {t('trips.detail.editTemplate')}
            </Button>
          </Link>
          {/* Archive for published trips, hard delete only for untouched drafts */}
          {trip.status !== TripStatus.Archived && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-danger hover:bg-danger/10 hover:text-danger border-danger/30"
              onClick={handleDelete}
              disabled={deleteTripMutation.isPending || archiveTripMutation.isPending}
            >
              <Trash className="h-4 w-4" /> 
              {trip.status === TripStatus.Draft
                ? (deleteTripMutation.isPending ? t('trips.detail.deleting') : t('trips.detail.delete'))
                : (archiveTripMutation.isPending ? t('trips.detail.archiving') : t('trips.detail.archive'))}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trip Template Overview */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border shadow-sm overflow-hidden bg-card">
             <div className="h-48 bg-muted">
                <Image src={trip.images?.[0] || "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?q=80&w=2070&auto=format&fit=crop"} alt={t('trips.detail.altTrip')} className="w-full h-full object-cover" width={800} height={400} />
             </div>
             <CardContent className="p-6 space-y-4">
                <div>
                   <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-accent border-accent/20 mb-2">{trip.category}</Badge>
                   <h1 className="text-2xl font-bold text-foreground">{trip.title}</h1>
                </div>
                <div className="space-y-3">
                   <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-muted-foreground" /> {trip.startLocation}
                   </div>
                   <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 text-muted-foreground" /> {t('trips.detail.duration', { days: trip.durationDays, nights: trip.durationNights })}
                   </div>
                </div>
                <div className="pt-4 border-t border-border">
                   <p className="text-sm text-muted-foreground leading-relaxed italic line-clamp-3">
                      {trip.description}
                   </p>
                </div>
             </CardContent>
          </Card>
          
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 space-y-2">
             <div className="flex items-center gap-2 text-primary font-bold">
                <AlertCircle className="h-5 w-5" />
                <span>{t('trips.detail.verificationRequired')}</span>
             </div>
             <p className="text-sm text-muted-foreground leading-relaxed">
                {t('trips.detail.verificationRequiredBody')}
             </p>
             <Link href="/dashboard/onboarding" className="inline-block text-sm font-bold text-primary underline mt-2">
                {t('trips.detail.checkVerificationStatus')}
             </Link>
          </div>
        </div>

        {/* Scheduler / Sessions */}
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
              onClick={() => setShowBulkSessionModal(true)} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-lg shadow-primary/20 flex-1"
              disabled={bulkCreateSessionMutation.isPending}
            >
              <Plus className="h-4 w-4" /> {t('trips.detail.bulkCreateSessions')}
            </Button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('list')}
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
                onClick={() => setViewMode('calendar')}
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
        title={t('trips.detail.deleteSessionTitle')}
        description={t('trips.detail.deleteSessionBody')}
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
        title={t('trips.detail.deleteTripTitle')}
        description={t('trips.detail.deleteTripBody')}
      />
    </div>
  );
}
