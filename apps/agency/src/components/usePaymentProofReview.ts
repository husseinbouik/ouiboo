'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { VerificationStatus, type BookingDetails } from '@ouiboo/types';
import { apiClient } from '@/lib/api-client';
import { applyProofDecision } from './paymentProofUtils';
import type { BankConfirmationPayload } from './PaymentProofBankConfirmation';

/**
 * #422 (Council P0-20): state + API wiring for the two-step manual payment
 * review on the agency bookings screen.
 * - Step 1 `review(true|false)`: accept/reject the proof image via
 *   verify-payment. Accepting does NOT settle — the modal stays open on
 *   the ACCEPTED booking so the agency lands on step 2. Rejecting closes
 *   the review (rejection is one-step and final).
 * - Step 2 `confirmBankPayment`: confirm the observed bank credit via
 *   confirm-bank-payment — the only action that settles the payment.
 * API failures surface as `actionError` (the server's message when it
 * provides one) and leave the review open.
 */
export function usePaymentProofReview() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [reviewingBooking, setReviewingBooking] = useState<BookingDetails | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const extractActionError = (error: unknown) => {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message;
    return typeof message === 'string' && message ? message : t('paymentProof.actionFailed');
  };

  const invalidateBookingQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ['agency-bookings'] });
    void queryClient.invalidateQueries({ queryKey: ['agency-dashboard-bookings'] });
    void queryClient.invalidateQueries({ queryKey: ['agency-dashboard-stats'] });
  };

  const reviewMutation = useMutation({
    mutationFn: async ({
      bookingId,
      approved,
      rejectionReason,
    }: {
      bookingId: string;
      approved: boolean;
      rejectionReason?: string;
    }) => {
      const response = await apiClient.patch(`/bookings/${bookingId}/verify-payment`, {
        approved,
        ...(rejectionReason ? { rejectionReason } : {}),
      });
      return response.data as Partial<BookingDetails>;
    },
    onSuccess: (updated, variables) => {
      invalidateBookingQueries();
      if (!variables.approved) {
        setReviewingBooking(null);
        return;
      }
      setReviewingBooking((prev) =>
        prev ? applyProofDecision(prev, updated, VerificationStatus.Accepted) : prev,
      );
    },
    onError: (error) => setActionError(extractActionError(error)),
  });

  const confirmBankMutation = useMutation({
    mutationFn: async ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: BankConfirmationPayload;
    }) => {
      const response = await apiClient.patch(
        `/bookings/${bookingId}/confirm-bank-payment`,
        payload,
      );
      return response.data as Partial<BookingDetails>;
    },
    onSuccess: (updated) => {
      invalidateBookingQueries();
      setReviewingBooking((prev) =>
        prev ? applyProofDecision(prev, updated, VerificationStatus.Verified) : prev,
      );
    },
    onError: (error) => setActionError(extractActionError(error)),
  });

  const openReview = (booking: BookingDetails) => {
    setActionError(null);
    setReviewingBooking(booking);
  };

  const closeReview = () => {
    setReviewingBooking(null);
    setActionError(null);
  };

  const approveProof = () => {
    if (!reviewingBooking) return;
    setActionError(null);
    reviewMutation.mutate({ bookingId: reviewingBooking.id, approved: true });
  };

  const rejectProof = (reason: string) => {
    if (!reviewingBooking) return;
    setActionError(null);
    reviewMutation.mutate({
      bookingId: reviewingBooking.id,
      approved: false,
      rejectionReason: reason,
    });
  };

  const confirmBankPayment = (payload: BankConfirmationPayload) => {
    if (!reviewingBooking) return;
    setActionError(null);
    confirmBankMutation.mutate({ bookingId: reviewingBooking.id, payload });
  };

  return {
    reviewingBooking,
    actionError,
    isReviewing: reviewMutation.isPending,
    isConfirming: confirmBankMutation.isPending,
    openReview,
    closeReview,
    approveProof,
    rejectProof,
    confirmBankPayment,
  };
}
