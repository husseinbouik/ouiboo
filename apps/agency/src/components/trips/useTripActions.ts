'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { TripStatus, type TripStatusType } from '@ouiboo/types';
import type { SessionItem, BulkSessionInput } from './trip-detail-types';

type UseTripActionsOptions = {
  tripId: string;
  tripStatus: TripStatusType | undefined;
};

export function useTripActions({ tripId, tripStatus }: UseTripActionsOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const deleteTripMutation = useMutation({
    mutationFn: async () => {
      // Drafts: hard delete. Published trips: archive (preserves records).
      if (tripStatus === TripStatus.Draft) {
        await apiClient.delete(`/trips/${tripId}`);
      } else {
        await apiClient.post(`/trips/${tripId}/archive`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
      router.push('/dashboard/trips');
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      const message = apiError.response?.data?.message;
      if (message) {
        console.error('Archive failed:', message);
      }
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: TripStatusType) => {
      await apiClient.patch(`/trips/${tripId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
    }
  });

  const bulkCreateSessionMutation = useMutation({
    mutationFn: async (sessions: BulkSessionInput[]) => {
      const results = await Promise.all(
        sessions.map(session =>
          apiClient.post(`/trips/${tripId}/sessions`, {
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
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    }
  });

  const archiveTripMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/trips/${tripId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
    }
  });

  const restoreTripMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/trips/${tripId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
    }
  });

  const deactivateTripMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/trips/${tripId}/deactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
    }
  });

  const activateTripMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/trips/${tripId}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
    }
  });

  return {
    deleteTripMutation,
    updateStatusMutation,
    bulkCreateSessionMutation,
    archiveTripMutation,
    restoreTripMutation,
    deactivateTripMutation,
    activateTripMutation,
  };
}

type UseSessionActionsOptions = {
  tripId: string;
  editingSession: SessionItem | null;
  deletingSession: SessionItem | null;
  onEditClose: () => void;
  onDeleteClose: () => void;
};

export function useSessionActions({
  tripId,
  editingSession,
  deletingSession,
  onEditClose,
  onDeleteClose,
}: UseSessionActionsOptions) {
  const queryClient = useQueryClient();

  const editSessionMutation = useMutation({
    mutationFn: async (data: Partial<SessionItem>) => {
      if (!editingSession) {
        throw new Error('No session selected for editing');
      }
      await apiClient.patch(`/trips/${tripId}/sessions/${editingSession.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      onEditClose();
    }
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async () => {
      if (!deletingSession) {
        throw new Error('No session selected for deletion');
      }
      await apiClient.delete(`/trips/${tripId}/sessions/${deletingSession.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      onDeleteClose();
    }
  });

  return { editSessionMutation, deleteSessionMutation };
}

export function useTripDetail(tripId: string) {
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const response = await apiClient.get(`/agency/trips/${tripId}`);
      return response.data;
    }
  });
}
