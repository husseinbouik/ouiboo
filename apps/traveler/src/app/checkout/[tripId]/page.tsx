'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/AuthContext';
import { type BookingDetails } from '@ouiboo/types';
import { Card, CardContent, CheckoutSkeleton } from '@ouiboo/ui';
import { useTranslation } from 'react-i18next';
import { getStagedAmounts, isStagedSession, type CheckoutTrip } from '@/components/checkout/checkout-types';
import { CheckoutHeader } from '@/components/checkout/CheckoutHeader';
import { CheckoutGuestForm } from '@/components/checkout/CheckoutGuestForm';
import { CheckoutPayment } from '@/components/checkout/CheckoutPayment';
import { CheckoutDisclaimer } from '@/components/checkout/CheckoutDisclaimer';
import { CheckoutSummary } from '@/components/checkout/CheckoutSummary';
import { useCheckoutBooking } from '@/components/checkout/useCheckoutBooking';

export default function CheckoutPage() {
  const { tripId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const sessionFromQuery = searchParams.get('session');
  const parsedGuestsCount = Number(searchParams.get('guests'));
  const guestsFromQuery = Number.isFinite(parsedGuestsCount) && parsedGuestsCount > 0
    ? parsedGuestsCount
    : null;
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [selectedSessionOverride, setSelectedSessionId] = useState<string | null>(null);
  const [guestCountOverride, setGuestCount] = useState<number | null>(null);
  const [fullNameOverride, setFullName] = useState<string | null>(null);
  const [phoneNumberOverride, setPhoneNumber] = useState<string | null>(null);
  const retryBookingId = searchParams.get('retryBooking');

  useEffect(() => {
    return () => {
      if (proofPreview) {
        URL.revokeObjectURL(proofPreview);
      }
    };
  }, [proofPreview]);

  const { data: trip, isLoading } = useQuery<CheckoutTrip>({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const response = await apiClient.get(`/trips/${tripId}`);
      return response.data;
    }
  });

  const { data: retryBooking } = useQuery<BookingDetails | null>({
    enabled: Boolean(retryBookingId),
    queryKey: ['retry-booking', retryBookingId],
    queryFn: async () => {
      if (!retryBookingId) {
        return null;
      }

      const response = await apiClient.get(`/bookings/${retryBookingId}`);
      return response.data;
    },
  });

  const selectedSessionId = selectedSessionOverride
    ?? sessionFromQuery
    ?? retryBooking?.session.id
    ?? trip?.sessions?.[0]?.id
    ?? null;
  const guestCount = guestCountOverride ?? guestsFromQuery ?? retryBooking?.guestsCount ?? 1;
  const fullName = fullNameOverride
    ?? retryBooking?.fullName
    ?? retryBooking?.traveler?.name
    ?? user?.name
    ?? '';
  const phoneNumber = phoneNumberOverride ?? retryBooking?.phoneNumber ?? '';
  const selectedSession = trip?.sessions?.find((session) => session.id === selectedSessionId);
  const sessionPrice = Number(selectedSession?.price ?? 0);
  const totalPrice = sessionPrice * guestCount;
  // #369: staged sessions collect only the deposit at checkout; the
  // balance is requested after the trip is confirmed.
  const stagedSession = isStagedSession(selectedSession) ? selectedSession : null;
  const stagedAmounts = stagedSession ? getStagedAmounts(stagedSession, guestCount) : null;
  const selectedCurrency = selectedSession?.currency;
  const bankDetails = trip?.agency?.bankDetails?.trim() ?? '';
  const hasBankDetails = bankDetails.length > 0;
  const sessionDateLabel = selectedSession
    ? `${new Date(selectedSession.startDate).toLocaleDateString()} - ${new Date(selectedSession.endDate).toLocaleDateString()}`
    : 'Select a session';

  const { createBookingMutation, errorMessage } = useCheckoutBooking({
    tripId,
    retryBookingId,
    selectedSessionId,
    guestCount,
    fullName,
    phoneNumber,
    hasBankDetails,
    proofFile,
  });

  const clearProof = () => {
    if (proofPreview) {
      URL.revokeObjectURL(proofPreview);
    }
    setProofPreview(null);
    setProofFile(null);
  };

  const handleProofUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (proofPreview) {
      URL.revokeObjectURL(proofPreview);
    }
    setProofPreview(URL.createObjectURL(file));
    setProofFile(file);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-muted/20 pb-40" role="status" aria-label="Initializing Security...">
      <div className="max-w-7xl mx-auto px-6 pt-32">
        <CheckoutSkeleton />
      </div>
      <span className="sr-only">Initializing Security...</span>
    </div>
  );
  if (!trip) return <div className="min-h-screen flex items-center justify-center font-black">Trip not found.</div>;

  const canSubmit = Boolean(
    selectedSessionId &&
    hasBankDetails &&
    fullName.trim() &&
    phoneNumber.trim()
  );

  return (
    <div className="min-h-screen bg-muted/20 pb-40">
      <div className="max-w-7xl mx-auto px-6 pt-32">
        <CheckoutHeader />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left: Form */}
          <div className="lg:col-span-8 space-y-8">
            <Card className="border-none shadow-xl shadow-black/5 rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-10 space-y-10">
                <CheckoutGuestForm
                  trip={trip}
                  retryBooking={retryBooking}
                  selectedSessionId={selectedSessionId}
                  onSelectSession={setSelectedSessionId}
                  guestCount={guestCount}
                  onGuestCountChange={setGuestCount}
                  fullName={fullName}
                  onFullNameChange={setFullName}
                  phoneNumber={phoneNumber}
                  onPhoneNumberChange={setPhoneNumber}
                  language={i18n.language}
                />
                <CheckoutPayment
                  bankDetails={bankDetails}
                  hasBankDetails={hasBankDetails}
                  proofPreview={proofPreview}
                  onProofUpload={handleProofUpload}
                  onClearProof={clearProof}
                  proofFile={proofFile}
                  isUploading={createBookingMutation.isPending}
                  stagedInfo={stagedAmounts && stagedSession ? {
                    depositDue: stagedAmounts.depositDue,
                    agencyName: trip.agency?.companyName || 'the agency',
                    minimumParticipants: stagedSession.minBookings ?? 0,
                    confirmationDeadline: stagedSession.confirmationDeadline ?? null,
                    currency: selectedCurrency,
                    language: i18n.language,
                  } : null}
                />
              </CardContent>
            </Card>

            <CheckoutDisclaimer />
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-4 sticky top-32">
            <CheckoutSummary
              trip={trip}
              sessionDateLabel={sessionDateLabel}
              guestCount={guestCount}
              totalPrice={totalPrice}
              selectedCurrency={selectedCurrency}
              language={i18n.language}
              errorMessage={errorMessage}
              isSubmitting={createBookingMutation.isPending}
              canSubmit={canSubmit}
              onSubmit={() => createBookingMutation.mutate()}
              stagedAmounts={stagedAmounts}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
