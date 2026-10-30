'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/AuthContext';
import { type BookingDetails } from '@ouiboo/types';
import { Card, CardContent } from '@ouiboo/ui';
import { CheckoutSkeleton } from '@/components/Skeletons';
import { useTranslation } from 'react-i18next';
import { computePricingTotal, getStagedAmounts, isStagedSession, type CheckoutTrip, type PricingSelectionState } from '@/components/checkout/checkout-types';
import { CheckoutPricingOptions } from '@/components/checkout/CheckoutPricingOptions';
import { CheckoutHeader } from '@/components/checkout/CheckoutHeader';
import { CheckoutGuestForm } from '@/components/checkout/CheckoutGuestForm';
import { CheckoutPayment } from '@/components/checkout/CheckoutPayment';
import { CheckoutDisclaimer } from '@/components/checkout/CheckoutDisclaimer';
import { CheckoutTermsAcceptance } from '@/components/checkout/CheckoutTermsAcceptance';
import { CheckoutSummary } from '@/components/checkout/CheckoutSummary';
import { useCheckoutBooking } from '@/components/checkout/useCheckoutBooking';

export default function CheckoutPage() {
  const { tripId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const sessionFromQuery = searchParams.get('session');
  const parsedGuestsCount = Number(searchParams.get('guests'));
  const guestsFromQuery = Number.isFinite(parsedGuestsCount) && parsedGuestsCount > 0
    ? parsedGuestsCount
    : null;
  const [proofFile, setProofFile] = useState<File | null>(null);
  // Batch F: render-stable "now" for the pay-later deadline preview.
  const [nowMs] = useState(() => Date.now());
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [selectedSessionOverride, setSelectedSessionId] = useState<string | null>(null);
  const [guestCountOverride, setGuestCount] = useState<number | null>(null);
  const [fullNameOverride, setFullName] = useState<string | null>(null);
  const [phoneNumberOverride, setPhoneNumber] = useState<string | null>(null);
  // B9: explicit terms acceptance — unchecked by default, gates submit.
  const [termsAccepted, setTermsAccepted] = useState(false);
  // #695: variant + add-on selection (ids/quantities only; the API
  // recomputes all amounts from the agency's stored prices).
  const [pricingSelection, setPricingSelection] = useState<PricingSelectionState>({ variantId: null, addOns: {} });
  const retryBookingId = searchParams.get('retryBooking');
  // Batch F elections from the trip page (#694/#696/#697/#701).
  const payLaterElection = searchParams.get('payLater') === '1';
  const payOnArrivalElection = searchParams.get('payOnArrival') === '1';
  const pickupFromQuery = searchParams.get('pickup');

  useEffect(() => {
    return () => {
      if (proofPreview) {
        URL.revokeObjectURL(proofPreview);
      }
    };
  }, [proofPreview]);

  const { data: trip, isLoading } = useQuery<CheckoutTrip>({
    // Content-language audit (#546): checkout fetched the trip with NO
    // locale — the API default (French) rendered at checkout whatever
    // the UI language. Same locale-scoped key as the detail page, so
    // both surfaces share the correctly-languaged entry.
    queryKey: ['trip', tripId, (i18n.language || 'en').split('-')[0]],
    queryFn: async () => {
      const response = await apiClient.get(`/trips/${tripId}?locale=${i18n.language}`);
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
  // #695: with a variant/add-on selection the displayed total is the
  // selection total (server recomputes it authoritatively at booking).
  const pricingTotals = trip ? computePricingTotal(trip, sessionPrice, guestCount, pricingSelection) : null;
  // #694: a private session's price is per-group — never × guests.
  const isPrivateCheckout = (selectedSession as { sessionKind?: string } | undefined)?.sessionKind === 'PRIVATE';
  const totalPrice = pricingTotals?.hasSelection
    ? pricingTotals.total
    : isPrivateCheckout
      ? sessionPrice
      : sessionPrice * guestCount;
  // #369: staged sessions collect only the deposit at checkout; the
  // balance is requested after the trip is confirmed.
  // #694: private sessions never use the staged min-group display.
  const stagedSession = !isPrivateCheckout && isStagedSession(selectedSession) ? selectedSession : null;
  const baseStagedAmounts = stagedSession ? getStagedAmounts(stagedSession, guestCount) : null;
  // #695: the deposit cap (30%) applies to the FINAL total when a
  // pricing selection repriced the booking — same rule as the API.
  const stagedAmounts = baseStagedAmounts
    ? pricingTotals?.hasSelection
      ? {
          depositDue: Math.min(baseStagedAmounts.depositDue, Math.floor(totalPrice * 0.3 * 100) / 100),
          balanceDue: totalPrice - Math.min(baseStagedAmounts.depositDue, Math.floor(totalPrice * 0.3 * 100) / 100),
          total: totalPrice,
        }
      : baseStagedAmounts
    : null;
  const selectedCurrency = selectedSession?.currency;
  const bankDetails = trip?.agency?.bankDetails?.trim() ?? '';
  const hasBankDetails = bankDetails.length > 0;
  const sessionDateLabel = selectedSession
    ? `${new Date(selectedSession.startDate).toLocaleDateString(i18n.language)} - ${new Date(selectedSession.endDate).toLocaleDateString(i18n.language)}`
    : t('checkout.selectSession');

  const { createBookingMutation, errorMessage } = useCheckoutBooking({
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
    payLater: payLaterElection,
    payOnArrival: payOnArrivalElection,
    pickupPointId: pickupFromQuery,
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
    <div className="min-h-screen bg-muted/20 pb-40" role="status" aria-label={t('checkout.initializing')}>
      <div className="max-w-7xl mx-auto px-6 pt-32">
        <CheckoutSkeleton />
      </div>
      <span className="sr-only">{t('checkout.initializing')}</span>
    </div>
  );
  if (!trip) return <div className="min-h-screen flex items-center justify-center font-black">{t('checkout.tripNotFound')}</div>;

  // B9: a retry only re-uploads proof for an existing booking (its
  // acceptance is already recorded), so the checkbox gates new
  // bookings only.
  const canSubmit = Boolean(
    selectedSessionId &&
    hasBankDetails &&
    fullName.trim() &&
    phoneNumber.trim() &&
    (retryBookingId || termsAccepted)
  );

  return (
    <div className="min-h-screen bg-muted/20 pb-40">
      <div className="max-w-7xl mx-auto px-6 pt-32">
        <CheckoutHeader />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left: Form */}
          <div className="lg:col-span-8 space-y-8">
            <Card className="border-none shadow-xl shadow-black/5 rounded-4xl overflow-hidden">
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
                <CheckoutPricingOptions
                  trip={trip}
                  selection={pricingSelection}
                  onChange={setPricingSelection}
                  language={i18n.language}
                />
                {payOnArrivalElection ? (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 dark:bg-sky-500/10 p-5 text-sm" data-testid="checkout-pay-on-arrival">
                    <p className="font-bold text-foreground">{t('batchF.payOnArrivalBadge')}</p>
                    <p className="mt-1 text-muted-foreground">
                      {t('batchF.payOnArrivalNote', { agency: trip.agency?.legalName ?? trip.agency?.companyName ?? t('batchF.theAgency') })}
                    </p>
                  </div>
                ) : payLaterElection ? (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 dark:bg-sky-500/10 p-5 text-sm" data-testid="checkout-pay-later">
                    <p className="font-bold text-foreground">{t('batchF.payLaterBadge')}</p>
                    <p className="mt-1 text-muted-foreground">
                      {t('batchF.payLaterNote', {
                        agency: trip.agency?.legalName ?? trip.agency?.companyName ?? t('batchF.theAgency'),
                        date: selectedSession
                          ? new Date(Math.min(nowMs + ((selectedSession as { payLaterHoldHours?: number | null }).payLaterHoldHours ?? 48) * 3600_000, new Date(selectedSession.startDate).getTime())).toLocaleDateString(i18n.language)
                          : '',
                      })}
                    </p>
                  </div>
                ) : null}
                {!payOnArrivalElection ? (
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
                    agencyName: trip.agency?.companyName || t('checkout.fallbackAgencyName'),
                    minimumParticipants: stagedSession.minBookings ?? 0,
                    confirmationDeadline: stagedSession.confirmationDeadline ?? null,
                    currency: selectedCurrency,
                    language: i18n.language,
                  } : null}
                />
                ) : null}
              </CardContent>
            </Card>

            <CheckoutDisclaimer />

            <CheckoutTermsAcceptance checked={termsAccepted} onChange={setTermsAccepted} />
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
