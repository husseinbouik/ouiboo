'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * #434 (Council P1-08): attendance recording on the agency bookings
 * screen. One call per booking: `attended: true` records ATTENDED (the
 * booking completes and becomes review-eligible for the traveller);
 * `attended: false` records NO_SHOW (the booking moves to the NO_SHOW
 * status and can never be reviewed). Recording is one-shot on the API —
 * a recorded outcome cannot be flipped from this screen.
 */
export function useAttendanceMarking() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ bookingId, attended }: { bookingId: string; attended: boolean }) => {
      const response = await apiClient.patch(`/bookings/${bookingId}/attendance`, { attended });
      return response.data;
    },
    onSuccess: () => {
      setAttendanceError(null);
      void queryClient.invalidateQueries({ queryKey: ['agency-bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['agency-dashboard-bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['agency-dashboard-stats'] });
    },
    onError: (error) => {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      setAttendanceError(
        typeof message === 'string' && message ? message : t('bookings.attendanceFailed'),
      );
    },
  });

  return {
    markAttendance: (bookingId: string, attended: boolean) =>
      mutation.mutate({ bookingId, attended }),
    isMarkingAttendance: mutation.isPending,
    attendanceError,
  };
}
