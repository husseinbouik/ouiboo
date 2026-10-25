'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { BookingResponse } from './checkout-types';
import { getErrorMessage } from './checkout-types';

type UseCheckoutBookingOptions = {
  tripId: string | string[] | undefined;
  retryBookingId: string | null;
  selectedSessionId: string | null;
  guestCount: number;
  fullName: string;
  phoneNumber: string;
  hasBankDetails: boolean;
  proofFile: File | null;
};

export function useCheckoutBooking({
  tripId,
  retryBookingId,
  selectedSessionId,
  guestCount,
  fullName,
  phoneNumber,
  hasBankDetails,
  proofFile,
}: UseCheckoutBookingOptions) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createBookingMutation = useMutation<BookingResponse, Error>({
    mutationFn: async () => {
      setErrorMessage(null);
      if (!selectedSessionId) {
        throw new Error(t('checkout.errors.sessionRequired'));
      }
      if (!fullName.trim() || !phoneNumber.trim()) {
        throw new Error(t('checkout.errors.guestDetailsRequired'));
      }
      if (!hasBankDetails) {
        throw new Error(t('checkout.errors.bankDetailsMissing'));
      }

      // Retry path: a booking already exists (created by a previous attempt whose proof
      // upload failed). Re-creating it would be rejected by the API's duplicate-booking
      // guard, so only (re)upload the proof against the existing booking.
      let bookingId = retryBookingId ?? null;

      if (!bookingId) {
        const response = await apiClient.post('/bookings', {
          sessionId: selectedSessionId,
          guestsCount: guestCount,
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          paymentMethod: 'BANK_TRANSFER',
          // #424: the traveller's active checkout locale — the API
          // persists it on the booking so booking-journey emails render
          // in this language.
          locale: (i18n.language || 'en').split('-')[0],
        });
        bookingId = response.data?.id ?? null;
      }

      if (proofFile && bookingId) {
        try {
          const formData = new FormData();
          formData.append('file', proofFile);
          await apiClient.post(`/bookings/${bookingId}/payment-proof`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch {
          // The booking was created but the proof upload failed. Route the traveler to
          // the existing retry flow rather than letting them re-submit and create a
          // second booking for the same session.
          throw Object.assign(new Error('PROOF_UPLOAD_FAILED'), { bookingId });
        }
      }

      return { id: bookingId } as BookingResponse;
    },
    onSuccess: (data) => {
      router.push(`/checkout/confirmation?bookingId=${data?.id ?? ''}&proof=${proofFile ? '1' : '0'}`);
    },
    onError: (error) => {
      const failedBookingId = (error as Error & { bookingId?: string }).bookingId;
      if (failedBookingId) {
        router.push(`/checkout/${tripId}?retryBooking=${failedBookingId}`);
        return;
      }
      setErrorMessage(getErrorMessage(error, t('checkout.errors.generic')));
    }
  });

  return { createBookingMutation, errorMessage };
}
