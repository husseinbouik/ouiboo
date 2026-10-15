'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BulkSessionCreationModal } from '@/components/BulkSessionCreationModal';
import { EditSessionModal } from '@/components/EditSessionModal';
import { DeleteConfirmation } from '@/components/DeleteConfirmation';
import { useTripActions, useSessionActions, useTripDetail } from '@/components/trips/useTripActions';
import { TripDetailHeader } from '@/components/trips/TripDetailHeader';
import { TripOverview } from '@/components/trips/TripOverview';
import { TripSessions } from '@/components/trips/TripSessions';
import type { SessionItem, TripDetail } from '@/components/trips/trip-detail-types';

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

  const { data: trip, isLoading, error } = useTripDetail(params.id);

  const {
    deleteTripMutation,
    archiveTripMutation,
    restoreTripMutation,
    deactivateTripMutation,
    activateTripMutation,
    bulkCreateSessionMutation,
  } = useTripActions({ tripId: params.id, tripStatus: (trip as TripDetail | undefined)?.status });

  const { editSessionMutation, deleteSessionMutation } = useSessionActions({
    tripId: params.id,
    editingSession,
    deletingSession,
    onEditClose: () => setEditingSession(null),
    onDeleteClose: () => {
      setDeletingSession(null);
      setDeleteConfirmOpen(false);
    },
  });

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
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
  if (error || !trip) return <div className="py-12 text-center text-danger">{t('trips.detail.errorLoading')}</div>;

  const typedTrip = trip as TripDetail;
  const sessions = typedTrip.sessions || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <TripDetailHeader
        tripId={params.id}
        tripStatus={typedTrip.status}
        isDeleting={deleteTripMutation.isPending}
        isArchiving={archiveTripMutation.isPending}
        isDeactivating={deactivateTripMutation.isPending}
        isActivating={activateTripMutation.isPending}
        isRestoring={restoreTripMutation.isPending}
        onDelete={handleDelete}
        onDeactivate={() => deactivateTripMutation.mutate()}
        onActivate={() => activateTripMutation.mutate()}
        onRestore={() => restoreTripMutation.mutate()}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <TripOverview trip={typedTrip} />
        <TripSessions
          sessions={sessions}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onBulkCreate={() => setShowBulkSessionModal(true)}
          isBulkCreating={bulkCreateSessionMutation.isPending}
          onEditSession={handleEditSession}
          onDeleteSession={handleDeleteSession}
          isSessionMutating={editSessionMutation.isPending || deleteSessionMutation.isPending}
        />
      </div>

      {/* Bulk Session Creation Modal */}
      <BulkSessionCreationModal
        isOpen={showBulkSessionModal}
        onClose={() => setShowBulkSessionModal(false)}
        onSubmit={(sessions) => bulkCreateSessionMutation.mutate(sessions)}
        isLoading={bulkCreateSessionMutation.isPending}
        currency={typedTrip?.currency ?? 'MAD'}
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
