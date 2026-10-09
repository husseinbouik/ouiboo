'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { type TripStatusType } from '@ouiboo/types';
import type { CreateTripInput } from '@ouiboo/schemas';
import { useTripWizardForm } from '@/components/trips/useTripWizardForm';
import { TripForm } from '@/components/trips/TripForm';

type TripEditorData = CreateTripInput & {
  title: string;
  description: string;
  category: CreateTripInput['category'];
  startLocation: string;
  durationDays: number;
  durationNights: number;
  status: TripStatusType;
};

export default function EditTripPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: trip, isLoading: isLoadingTrip } = useQuery<TripEditorData>({
    queryKey: ['trip', id],
    queryFn: async () => {
      const response = await apiClient.get(`/agency/trips/${id}`);
      return response.data;
    }
  });

  const form = useTripWizardForm();

  useEffect(() => {
    if (trip) {
      form.reset({
        title: trip.title,
        description: trip.description,
        category: trip.category,
        startLocation: trip.startLocation,
        endLocation: trip.endLocation,
        durationDays: trip.durationDays,
        durationNights: trip.durationNights,
        inclusions: trip.inclusions || [],
        exclusions: trip.exclusions || [],
        checklist: trip.checklist || [],
        images: trip.images || [],
        itinerary: trip.itinerary || [],
        status: trip.status,
        currency: trip.currency || 'MAD',
      });
    }
  }, [trip, form.reset]);

  const updateTripMutation = useMutation({
    mutationFn: async (data: CreateTripInput) => {
      const response = await apiClient.patch(`/trips/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      router.push(`/dashboard/trips/${id}`);
    }
  });

  const onSubmit = (data: CreateTripInput) => {
    // Safety check: only allow submission from the final step
    if (form.step < 4) {
      form.nextStep();
      return;
    }

    // Clean up itinerary data to remove IDs and ensure proper types
    const cleanedData = {
      ...data,
      itinerary: data.itinerary?.map((day: { dayNumber: number; title?: string; description: string; activities: string[] }) => ({
        dayNumber: Number(day.dayNumber),
        title: day.title,
        description: day.description,
        activities: Array.isArray(day.activities) ? day.activities : []
      })),
      // Ensure inclusions, exclusions, and checklist are arrays of strings
      inclusions: data.inclusions?.filter((item: string) => typeof item === 'string' && item.trim() !== '') || [],
      exclusions: data.exclusions?.filter((item: string) => typeof item === 'string' && item.trim() !== '') || [],
      checklist: data.checklist?.filter((item: string) => typeof item === 'string' && item.trim() !== '') || [],
    };

    updateTripMutation.mutate(cleanedData);
  };

  if (isLoadingTrip) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
    </div>
  );

  const stepSubtitles: Record<number, string> = {
    1: t('trips.edit.subtitle1'),
    2: t('trips.edit.subtitle2'),
    3: t('trips.edit.subtitle3'),
    4: t('trips.edit.subtitle4'),
  };

  return (
    <TripForm
      mode="edit"
      t={t}
      form={form}
      backHref={`/dashboard/trips/${id}`}
      backLabel={t('trips.edit.backToDetail')}
      title={t('trips.edit.title', { title: trip?.title })}
      subtitle={stepSubtitles[form.step]}
      onSubmit={onSubmit}
      isSubmitting={updateTripMutation.isPending}
      submitLabel={t('common.save')}
      submitPendingLabel={t('common.saving')}
      showSaveIcon
    />
  );
}
