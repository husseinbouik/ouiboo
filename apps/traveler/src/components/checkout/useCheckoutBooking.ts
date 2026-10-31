'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { CURRENT_BOOKING_TERMS_VERSION } from '@ouiboo/types';
import type { BookingResponse, PricingSelectionState } from './checkout-types';
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
  /** B9: the traveller's explicit terms acceptance (checkout checkbox). */
  termsAccepted: boolean;
  /** #695: variant + add-on selection (ids/quantities only). */
  pricingSelection?: PricingSelectionState;
  /** Batch F elections carried from the trip page (#696/#697/#701). */
  payLater?: boolean;
  payOnArrival?: boolean;
  pickupPointId?: string | null;
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
  termsAccepted,
  pricingSelection,
  payLater,
  payOnArrival,
  pickupPointId,
}: UseCheckoutBookingOptions) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // #494 (B16): one idempotency key per booking attempt and one per
  // proof attempt, generated once per checkout mount — double submits
  // and retries replay the SAME key, so the API returns the original
  // booking/proof instead of duplicating. A new visit = new keys.
  const [bookingIdempotencyKey] = useState(() => crypto.randomUUID());
  const [proofIdempotencyKey] = useState(() => crypto.randomUUID());

  const createBookingMutation = useMutation<BookingResponse, Error>({
    mutationFn: async () => {
      setErrorMessage(null);
      if (!selectedSessionId) {
        throw new Error(t('checkout.errors.sessionRequired'));
      }
      if (!fullName.trim() || !phoneNumber.trim()) {
        throw new Error(t('checkout.errors.guestDetailsRequired'));
      }
      // #697: pay-on-arrival bookings collect nothing at checkout —
      // the traveller pays the agency on site, so bank details and a
      // proof are not part of this flow at all.
      if (!hasBankDetails && !payOnArrival) {
        throw new Error(t('checkout.errors.bankDetailsMissing'));
      }
      // B9: never create a booking without the explicit acceptance —
      // the API rejects it (400) either way; failing here keeps the
      // traveller on the checkout with a clear message.
      if (!retryBookingId && !termsAccepted) {
        throw new Error(t('checkout.errors.termsRequired'));
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
          // #481 + B9: explicit acceptance of the booking terms this
          // checkout displays. The API requires the termsAccepted flag
          // (the version alone is not acceptance), rejects versions
          // outside its allowlist, and persists version + locale with a
          // server acceptance timestamp, so the booking proves which
          // terms it was made under and in which language.
          termsAccepted,
          termsVersion: CURRENT_BOOKING_TERMS_VERSION,
          // #695: pricing selection — sent only when something was
          // actually selected; the API resolves prices server-side.
          ...(pricingSelection?.variantId ? { variantId: pricingSelection.variantId } : {}),
          ...(pricingSelection && Object.entries(pricingSelection.addOns).some(([, q]) => q > 0)
            ? {
                addOns: Object.entries(pricingSelection.addOns)
                  .filter(([, q]) => q > 0)
                  .map(([addOnId, quantity]) => ({ addOnId, quantity })),
              }
            : {}),
          // Batch F: payment-shape elections + pickup choice — the
          // API validates them against the session/template facts.
          ...(payLater ? { payLater: true } : {}),
          ...(payOnArrival ? { payOnArrival: true } : {}),
          ...(pickupPointId ? { pickupPointId } : {}),
        }, {
          headers: { 'Idempotency-Key': bookingIdempotencyKey },
        });
        bookingId = response.data?.id ?? null;
      }

      if (proofFile && bookingId) {
        try {
          const formData = new FormData();
          formData.append('file', proofFile);
          await apiClient.post(`/bookings/${bookingId}/payment-proof`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Idempotency-Key': proofIdempotencyKey,
            }
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
