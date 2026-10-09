'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { TripCategory, TripStatus } from '@ouiboo/types';
import type { CreateTripInput } from '@ouiboo/schemas';
import { useTripWizardForm } from '@/components/trips/useTripWizardForm';
import { TripForm } from '@/components/trips/TripForm';

type ApiError = {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
  message?: string;
};

export default function CreateTripPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useTripWizardForm({
    defaultValues: {
      category: TripCategory.Adventure,
      inclusions: [],
      exclusions: [],
      checklist: [],
      images: [],
      status: TripStatus.Draft,
      currency: 'MAD',
      durationDays: 1,
      durationNights: 0,
    },
    validateImageSize: true,
    translateUploadErrors: true,
  });

  const createTripMutation = useMutation({
    mutationFn: async (data: CreateTripInput) => {
      const response = await apiClient.post('/trips', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
      router.push('/dashboard/trips');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || error.message || t('trips.create.createError');
      form.setSubmissionError(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const onSubmit = (data: CreateTripInput) => {
    form.setSubmissionError('');
    // Safety check: only allow submission from the final step
    if (form.step < 4) {
      form.nextStep();
      return;
    }

    // Clean up itinerary data to remove IDs and ensure proper types
    const cleanedData = {
      ...data,
      itinerary: data.itinerary?.map((day) => ({
        dayNumber: Number(day.dayNumber),
        title: day.title,
        description: day.description,
        activities: Array.isArray(day.activities) ? day.activities : []
      }))
    };

    createTripMutation.mutate(cleanedData);
  };

  const stepTitles: Record<number, string> = {
    1: t('trips.create.steps.basic'),
    2: t('trips.create.steps.itinerary'),
    3: t('trips.create.steps.media'),
    4: t('trips.create.steps.pricing'),
  };

  return (
    <TripForm
      mode="create"
      t={t}
      form={form}
      backHref="/dashboard/trips"
      backLabel={t('trips.detail.backToTrips')}
      title={stepTitles[form.step]}
      subtitle={t('trips.create.subtitle')}
      onSubmit={onSubmit}
      isSubmitting={createTripMutation.isPending}
      submitLabel={t('common.publish')}
      submitPendingLabel={t('common.publishing')}
      disableContinueWhileValidating
    />
  );
}
