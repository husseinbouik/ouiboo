'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * #697 (Council S6 Batch F): agency confirmation of a pay-on-arrival
 * booking. The booking exists before any money moves; confirming it
 * commits the agency to hold the places while the traveller pays the
 * agency on site. No money passes through Ouiboo.
 */
export function usePayOnArrivalConfirm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiClient.patch(`/bookings/${bookingId}/confirm-pay-on-arrival`);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agency-bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['agency-dashboard-bookings'] });
    },
  });

  return {
    confirmPayOnArrival: (bookingId: string) => mutation.mutate(bookingId),
    isConfirmingPayOnArrival: mutation.isPending,
  };
}
