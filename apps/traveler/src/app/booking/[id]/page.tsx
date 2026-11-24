'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { BookingPaymentStatus, BookingStatus, RefundStatus, VerificationStatus, type BookingDetails } from '@ouiboo/types';
import { Badge, Button, Card } from '@ouiboo/ui';
import { BookingDetailSkeleton } from '@/components/Skeletons';
import { JourneyTimeline, type JourneyStep } from '@/components/JourneyTimeline';
import { ProofUploadFeedback } from '@/components/ProofUploadFeedback';
import { cn } from '@ouiboo/ui/utils';
import {
  Calendar,
  Check,
  Loader2,
  MapPin,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { CancellationScaleCard } from '@/components/CancellationScaleCard';
import SellerIdentity from '@/components/SellerIdentity';
import MessageAgencyButton from '@/components/MessageAgencyButton';
import {
  canRetryTravelerPayment,
  canCancelTravelerBooking,
  getTravelerBookingStatusTone,
  getTravelerPaymentStatusMeta,
  getTravelerProofStatus,
  shouldShowUploadAction,
  shouldShowTripContacts,
  formatCurrency,
  normalizeCurrency,
  toPaginatedList,
} from '@ouiboo/utils';
import { ReviewForm } from '@/components/ReviewForm';
import { useTranslation } from 'react-i18next';
import { TripContactsCard } from '@/components/TripContactsCard';
import { BookingPassCard, CachedBookingPass } from '@/components/BookingPassCard';
import { AttendanceCard } from '@/components/AttendanceCard';
import { RefundCaseCard, type TravelerRefundCaseView } from '@/components/RefundCaseCard';
import SellerBlock from '@/components/SellerBlock';
import PlatformIdentity from '@/components/PlatformIdentity';
import VerificationRecord from '@/components/VerificationRecord';
import { useDisplayAmountConverter } from '@/lib/display-currency';
import { localizeLocationSuffix } from '@/lib/localized-location';

/**
 * #663 (checkout item): the booking confirmation rendered the
 * authoritative currency only, while checkout showed the traveller's
 * display currency — an unexplained currency switch mid-journey. The
 * total now dual-displays: the authoritative (charged) amount first,
 * the display-currency figure beside it as a reference whenever the
 * two differ. The booking's own currency stays the governing one.
 */
function BookingTotalWithDisplay({
  amount,
  currency,
  language,
}: {
  amount: number | string;
  currency?: string | null;
  language: string;
}) {
  const convert = useDisplayAmountConverter(currency);
  const numeric = Number(amount);
  const authoritative = formatCurrency(numeric, currency, language);
  const converted = convert(numeric);
  if (!converted || converted.currency === normalizeCurrency(currency)) {
    return <>{authoritative}</>;
  }
  return (
    <>
      {authoritative}{' '}
      <span className="font-medium text-muted-foreground">
        ({formatCurrency(converted.amount, converted.currency, language)})
      </span>
    </>
  );
}

export default function BookingDetailsPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const bookingId = Array.isArray(id) ? id[0] : id;
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  // #988: Cash Plus transaction code for the current stage's proof.
  const [cashPlusCode, setCashPlusCode] = useState('');
  const [codeSubmitting, setCodeSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelRefundState, setCancelRefundState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [cancelRefundError, setCancelRefundError] = useState('');

  const { data: booking, isLoading } = useQuery<BookingDetails | null>({
    enabled: Boolean(bookingId),
    // #567: locale-scoped key + ?locale= so the API resolves the trip
    // title in the reader's language (it previously always served the
    // canonical French title on this surface).
    queryKey: ['booking-details-page', bookingId, (i18n.language || 'en').split('-')[0]],
    queryFn: async () => {
      if (!bookingId) {
        return null;
      }

      const response = await apiClient.get(`/bookings/${bookingId}?locale=${i18n.language}`);
      return response.data;
    },
  });

  // #699 (Council S6): this booking's refund case, if any — rendered
  // end-to-end by RefundCaseCard below (agency = obligor, Ouiboo =
  // tracking). Same query key as the bookings list, so both surfaces
  // share one fetch. The shared cache entry is the RAW paginated
  // payload (the bookings list's shape): both surfaces must cache
  // the same shape and normalize at read time. Caching an unwrapped
  // array here instead made the list-cached object crash this page
  // ("find is not a function") on the list -> detail navigation
  // (Batch D witness fix).
  const { data: rawRefundCases } = useQuery<unknown>({
    enabled: Boolean(bookingId),
    queryKey: ['my-refunds'],
    queryFn: async () => {
      const response = await apiClient.get('/refunds/mine', { params: { limit: 100 } });
      return response.data;
    },
  });
  const { data: myRefundCases } = toPaginatedList<TravelerRefundCaseView>(rawRefundCases);

  const uploadProofMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      if (cashPlusCode.trim()) {
        formData.append('transactionCode', cashPlusCode.trim());
      }
      await apiClient.post(`/bookings/${bookingId}/payment-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['booking-details-page', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setUploading(false);
    },
    onError: () => {
      setUploading(false);
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch(`/bookings/${bookingId}/cancel`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['booking-details-page', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setCancelling(false);
    },
    onError: () => {
      setCancelling(false);
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    uploadProofMutation.mutate(file);
  };

  // #988: submit the Cash Plus transaction code as this stage's proof.
  const handleSubmitCashPlusCode = async () => {
    if (!cashPlusCode.trim() || !bookingId) return;
    setCodeSubmitting(true);
    try {
      await apiClient.post(`/bookings/${bookingId}/payment-proof-code`, {
        transactionCode: cashPlusCode.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ['booking-details-page', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    } finally {
      setCodeSubmitting(false);
    }
  };

  const handleCancel = () => {
    setCancelling(true);
    cancelBookingMutation.mutate();
  };

  // #417 (Council P0-11): cancelling a PAID booking goes through the
  // refund workflow — the amount is computed server-side from this
  // booking's cancellation scale, never typed in by the traveller.
  const cancelRefundMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/refunds/request', { bookingId, cancellation: true });
    },
    onSuccess: async () => {
      setCancelRefundState('sent');
      await queryClient.invalidateQueries({ queryKey: ['booking-details-page', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['my-refunds'] });
    },
    onError: (error: unknown) => {
      setCancelRefundState('error');
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCancelRefundError(typeof message === 'string' ? message : t('bookingDetail.refundRequestError'));
    },
  });

  const handleCancelWithRefund = () => {
    setCancelRefundState('sending');
    setCancelRefundError('');
    cancelRefundMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-6 pt-28 pb-20" role="status" aria-label={t('bookingDetail.loading')}>
        <div className="max-w-5xl mx-auto">
          <BookingDetailSkeleton />
        </div>
        <span className="sr-only">{t('bookingDetail.loading')}</span>
      </div>
    );
  }

  if (!booking) {
    // #847: a failed load is not proof the booking is gone — offline,
    // this query simply cannot answer. If the device holds the booking's
    // pass artefact (#690), render the pass from it; the not-found card
    // is only the fallback when no artefact exists.
    return (
      <div className="min-h-screen bg-background px-6 pt-28 pb-20">
        <div className="max-w-5xl mx-auto">
          <CachedBookingPass
            bookingId={bookingId ?? ''}
            fallback={
              <Card className="max-w-xl w-full mx-auto rounded-3xl p-8 text-center">
                <h1 className="text-2xl font-black text-foreground">{t('bookingDetail.notFoundTitle')}</h1>
                <p className="mt-3 text-muted-foreground">{t('bookingDetail.notFoundBody')}</p>
                <Button asChild className="rounded-xl">
                  <Link href="/bookings">{t('bookingDetail.backToBookings')}</Link>
                </Button>
              </Card>
            }
          />
        </div>
      </div>
    );
  }

  const tripImage = booking.session.template.images[0] || 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43';
  const proofStatus = getTravelerProofStatus(booking.paymentProof?.status);
  const paymentStatus = getTravelerPaymentStatusMeta(booking.paymentStatus, booking.refundStatus);
  // #567: the @ouiboo/utils status helpers return English labels; this
  // page renders the locale equivalents (same state logic, localised
  // wording) and keeps only the helpers' classNames.
  const proofLabel = !booking.paymentProof?.status
    ? t('bookingDetail.proofStatus.notUploaded')
    : booking.paymentProof.status === VerificationStatus.Verified
      ? t('bookingDetail.proofStatus.paymentConfirmed')
      : booking.paymentProof.status === VerificationStatus.Rejected
        ? t('bookingDetail.proofStatus.rejected')
        : booking.paymentProof.status === VerificationStatus.Accepted
          ? t('bookingDetail.proofStatus.acceptedPending')
          : t('bookingDetail.proofStatus.receivedAwaiting');
  // #616: the payment snapshot's system values (payment method,
  // refund status) are enum codes — render their locale strings,
  // falling back to the raw value for any unmapped code.
  const paymentMethodLabel = booking.manualPaymentChannel === 'CASH_PLUS'
    ? t('bookingDetail.paymentMethodValue.CASH_PLUS')
    : booking.manualPaymentChannel === 'BANK_TRANSFER'
      ? t('bookingDetail.paymentMethodValue.BANK_TRANSFER')
      : t(`bookingDetail.paymentMethodValue.${booking.paymentMethod}`, {
          defaultValue: booking.paymentMethod,
        });
  const refundStatusLabel = booking.refundStatus
    ? t(`bookingDetail.refundStatusValue.${booking.refundStatus}`, {
        defaultValue: booking.refundStatus.replace('_', ' '),
      })
    : '';
  const paymentLabel =
    booking.refundStatus === RefundStatus.Processed &&
    (booking.paymentStatus === BookingPaymentStatus.Paid || booking.paymentStatus === BookingPaymentStatus.PartiallyPaid)
      ? t('bookingDetail.paymentStatus.partiallyRefunded')
      : booking.paymentStatus === BookingPaymentStatus.PartiallyPaid
        ? t('bookingDetail.paymentStatus.depositPaid')
        : booking.paymentStatus === BookingPaymentStatus.Paid
          ? t('bookingDetail.paymentStatus.paid')
          : booking.paymentStatus === BookingPaymentStatus.Refunded
            ? booking.refundStatus === RefundStatus.Processed
              ? t('bookingDetail.paymentStatus.refunded')
              : t('bookingDetail.paymentStatus.refundInProgress')
            : booking.paymentStatus === BookingPaymentStatus.Failed
              ? t('bookingDetail.paymentStatus.failed')
              : t('bookingDetail.paymentStatus.unpaid');
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(i18n.language || 'en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  const showUploadAction = shouldShowUploadAction(
    booking.status,
    Boolean(booking.paymentProof),
    booking.paymentPlan?.status,
  );
  // #680: when the Emergency Card renders, the meeting point rides on
  // it — the standalone block below remains only for booking states
  // the card does not cover (cancelled / completed).
  const showContactsCard = shouldShowTripContacts(booking.status);
  const showRetryPayment = canRetryTravelerPayment(booking);
  const canReviewBooking = booking.status === BookingStatus.Completed && !booking.review;
  const refundCaseForBooking = myRefundCases?.find((refundCase) => refundCase.bookingId === booking.id);
  const showAttendanceCard = Boolean(
    booking.attendance || booking.passCheckInAt || booking.status === BookingStatus.Completed || booking.status === BookingStatus.NoShow,
  );
  const retryHref = `/checkout/${booking.session.template.id}?session=${booking.session.id}&guests=${booking.guestsCount}&retryBooking=${booking.id}`;

  // Phase 2 — Booking detail A: the two-stage payment journey as page
  // structure (deposit -> agency/group confirmation -> balance).
  const depositSettled = booking.paymentStatus === BookingPaymentStatus.Paid || booking.paymentStatus === BookingPaymentStatus.PartiallyPaid;
  const fullyPaid = booking.paymentStatus === BookingPaymentStatus.Paid;
  const journeySteps: JourneyStep[] = [
    {
      title: t('bookingDetail.journeyDepositTitle'),
      description: depositSettled ? t('bookingDetail.journeyDepositDone') : booking.paymentProof ? t('bookingDetail.journeyDepositProof') : t('bookingDetail.journeyDepositTodo'),
      state: depositSettled ? 'complete' : 'current',
    },
    {
      title: t('bookingDetail.journeyConfirmTitle'),
      description: booking.status === BookingStatus.Confirmed ? t('bookingDetail.journeyConfirmDone') : t('bookingDetail.journeyConfirmTodo'),
      state: booking.status === BookingStatus.Confirmed ? 'complete' : depositSettled ? 'current' : 'upcoming',
    },
    {
      title: t('bookingDetail.journeyBalanceTitle'),
      description: fullyPaid ? t('bookingDetail.journeyBalanceDone') : t('bookingDetail.journeyBalanceTodo'),
      state: fullyPaid ? 'complete' : depositSettled ? 'current' : 'upcoming',
    },
  ];

  return (
    <div className="min-h-screen bg-background px-6 pt-28 pb-20">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black font-display tracking-tight text-foreground">{booking.session.template.title}</h1>
            <p className="text-muted-foreground mt-2">{t('bookingDetail.subtitle')}</p>
            <p className="text-xs text-muted-foreground mt-1"><span className="font-semibold">{t('bookingDetail.reference')}:</span> <span className="font-mono">{booking.id}</span></p>
          </div>
          <Button asChild variant="outline" className="rounded-xl font-bold">
              <Link href="/bookings">{t('bookingDetail.backToBookings')}</Link>
            </Button>
        </div>

        <Card className="border border-border shadow-sm rounded-3xl bg-card p-6 sm:p-8">
          <JourneyTimeline steps={journeySteps} />
        </Card>

        <Card className="group border border-border shadow-sm rounded-3xl overflow-hidden bg-card">
          <div className="flex flex-col lg:flex-row">
            <div className="w-full lg:w-96 h-64 lg:h-auto overflow-hidden relative">
              <Image
                src={tripImage}
                alt={booking.session.template.imageAlts?.[0]?.trim() || booking.session.template.title}
                className="absolute inset-0 w-full h-full object-cover"
                fill
                sizes="(max-width: 1024px) 100vw, 24rem"
                unoptimized={tripImage.startsWith('http')}
              />
              <div className="absolute top-5 left-5 flex flex-wrap gap-2">
                <Badge className={cn(
                  'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl backdrop-blur-md border-none',
                  getTravelerBookingStatusTone(booking.status),
                )}>
                  {t(`bookingDetail.status.${booking.status}`, { defaultValue: booking.status.replace('_', ' ') })}
                </Badge>
                <Badge className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${paymentStatus.className}`}>
                  {paymentLabel}
                </Badge>
              </div>
            </div>

            <div className="p-8 flex-1 space-y-8">
              <div className="space-y-4">
                <h2 className="sr-only">{booking.session.template.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-black uppercase tracking-widest">
                      <Calendar className="h-4 w-4 text-sunset-orange" /> {t('bookingDetail.date')}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">
                      {formatDate(booking.session.startDate)} – {formatDate(booking.session.endDate)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-black uppercase tracking-widest">
                      <MapPin className="h-4 w-4 text-sunset-orange" /> {t('bookingDetail.location')}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">{localizeLocationSuffix(booking.session.template.startLocation, t('countries.morocco'))}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-black uppercase tracking-widest">
                      <Users className="h-4 w-4 text-sunset-orange" /> {t('bookingDetail.guestsLabel')}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">{t('bookingDetail.guests', { count: booking.guestsCount })}</p>
                  </div>
                </div>
              </div>

              {/* B4 (Council Session #2): the Law 31-08 seller identity
                  block on the durable booking confirmation — legal name,
                  licence type + number, issue date, issuing authority,
                  and the #413 what+when checks. Legacy records missing
                  the issue data show the honest pending line. */}
              {/* #676: the booking view is where the EXACT meeting
                  point appears — address + map link (public trip
                  pages show the area only), plus the pickup note. */}
              {booking.session.template.meetingPoint && !showContactsCard && (
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-5" data-testid="booking-meeting-point">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {t('bookingDetail.meetingPoint')}
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
                    {booking.session.template.meetingPoint.address && (
                      <p className="font-semibold text-foreground">{booking.session.template.meetingPoint.address}</p>
                    )}
                    {booking.session.template.meetingPoint.pickupAvailable && (
                      <p className="text-muted-foreground">{t('bookingDetail.meetingPickup')}</p>
                    )}
                    {booking.session.template.meetingPoint.mapsUrl && (
                      <a
                        href={booking.session.template.meetingPoint.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold text-sunset-orange hover:underline"
                      >
                        <MapPin className="h-4 w-4" /> {t('bookingDetail.viewOnMap')}
                      </a>
                    )}
                  </div>
                </div>
              )}

              <SellerIdentity agency={booking.session.template.agency} />

              {/* #729: contact path from the booking view — questions,
                  payment problems and changes land in the pair
                  conversation with this booking's agency. (Restored in
                  W12 after PR #826's squash dropped it — see #729.) */}
              <div className="mt-4">
                <MessageAgencyButton
                  agencyId={booking.session.template.agency?.id}
                  agencyName={booking.session.template.agency?.companyName}
                />
              </div>

              {/* #700 (Council S6): the Art. 29(2) seller block repeated
                  on the durable booking confirmation. */}
              <SellerBlock agency={booking.session.template.agency} showRecordLink />

              {/* #627 (Council S4): the platform identity block on the
                  durable confirmation — who Ouiboo is, and how to
                  reach it (support email / WhatsApp escalation /
                  complaints path). */}
              <PlatformIdentity />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('bookingDetail.travelerDetails')}</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <p><span className="font-black text-foreground">{t('bookingDetail.name')}:</span> {booking.fullName || booking.traveler.name || t('bookingDetail.notProvided')}</p>
                    <p><span className="font-black text-foreground">{t('bookingDetail.email')}:</span> {booking.traveler.email}</p>
                    <p><span className="font-black text-foreground">{t('bookingDetail.phone')}:</span> {booking.phoneNumber || t('bookingDetail.notProvided')}</p>
                    <p className="text-muted-foreground">{t('bookingDetail.idNote')}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('bookingDetail.paymentSnapshot')}</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <p><span className="font-black text-foreground">{t('bookingDetail.total')}:</span> <BookingTotalWithDisplay amount={booking.totalAmount} currency={booking.currency} language={i18n.language} /></p>
                    <p><span className="font-black text-foreground">{t('bookingDetail.method')}:</span> {paymentMethodLabel}</p>
                    {(booking.paymentProof?.stagePayments ?? [])
                      .filter((stagePayment) => stagePayment.transactionCode)
                      .map((stagePayment) => (
                        <p key={stagePayment.stage ?? 'FULL'}>
                          <span className="font-black text-foreground">{t('bookingDetail.cashPlusCodeLabel', { stage: stagePayment.stage ?? '' })}:</span>{' '}
                          <span className="font-mono">{stagePayment.transactionCode}</span>
                        </p>
                      ))}
                    <p><span className="font-black text-foreground">{t('bookingDetail.proof')}:</span> {proofLabel}</p>
                    {booking.refundStatus && (
                      <p><span className="font-black text-foreground">{t('bookingDetail.refund')}:</span> {refundStatusLabel}</p>
                    )}
                    {booking.confirmedAt && (
                      <p><span className="font-black text-foreground">{t('bookingDetail.confirmed')}:</span> {formatDate(booking.confirmedAt)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* #481 + B9: the terms this booking was made under —
                  version + acceptance time + checkout locale, read-only
                  evidence for the traveller. */}
              {booking.termsVersion && (
                <p className="text-xs text-muted-foreground">
                  {t('bookingDetail.termsAccepted', { version: booking.termsVersion })}
                  {booking.termsAcceptedAt
                    ? ` · ${new Intl.DateTimeFormat(i18n.language || 'en', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(booking.termsAcceptedAt))}`
                    : ''}
                  {booking.locale ? ` · ${booking.locale}` : ''}
                </p>
              )}

              {/* #422 (Council P0-20): an uploaded or accepted proof is not a
                  settled payment — settlement is the agency's bank confirmation. */}
              {booking.paymentProof && booking.paymentProof.status !== VerificationStatus.Verified && booking.paymentProof.status !== VerificationStatus.Rejected && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-5 text-sm font-semibold text-foreground">
                  {booking.paymentProof.status === VerificationStatus.Accepted
                    ? <>{t('bookingDetail.proofAccepted', { agency: booking.session.template.agency?.companyName || t('bookingDetail.defaultAgency') })}</>
                    : <>{t('bookingDetail.proofReceived', { agency: booking.session.template.agency?.companyName || t('bookingDetail.defaultAgency') })}</>}
                </div>
              )}

              {(booking.paymentProof?.rejectionReason || booking.refundStatus) && (
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 text-sm text-muted-foreground">
                  {booking.paymentProof?.rejectionReason && (
                    <p>
                      <span className="font-black text-foreground">{t('bookingDetail.paymentProofNote')}:</span> {booking.paymentProof.rejectionReason}
                    </p>
                  )}
                  {booking.refundStatus && (
                    <p className={booking.paymentProof?.rejectionReason ? 'mt-2' : ''}>
                      <span className="font-black text-foreground">{t('bookingDetail.refundStatus')}:</span> {refundStatusLabel}
                    </p>
                  )}
                </div>
              )}

              {booking.manualPaymentChannel === 'CASH_PLUS' && showUploadAction && (
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 space-y-3">
                  <p className="text-sm font-semibold text-foreground">{t('bookingDetail.cashPlusPayAtPoint', { agency: booking.session.template.agency?.companyName || t('bookingDetail.defaultAgency') })}</p>
                  {booking.session.template.agency?.cashPlus && (
                    <p className="text-sm text-foreground">
                      <span className="font-black">{t('bookingDetail.cashPlusBeneficiary')}:</span> {booking.session.template.agency.cashPlus.beneficiaryName}
                      {' · '}
                      <span className="font-mono">{booking.session.template.agency.cashPlus.phone}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{t('bookingDetail.cashPlusFeeNote')}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      value={cashPlusCode}
                      onChange={(event) => setCashPlusCode(event.target.value)}
                      placeholder={t('bookingDetail.cashPlusCodePlaceholder')}
                      aria-label={t('bookingDetail.cashPlusCodePlaceholder')}
                      className="h-12 px-4 rounded-xl border border-border bg-card text-sm font-mono min-w-56"
                    />
                    <Button
                      onClick={handleSubmitCashPlusCode}
                      disabled={!cashPlusCode.trim() || codeSubmitting}
                      className="h-12 px-6 rounded-xl bg-sunset-orange text-deep-blue hover:bg-sunset-orange-dark hover:text-white border-none text-xs font-black uppercase tracking-widest"
                    >
                      {codeSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('bookingDetail.cashPlusSubmitCode')}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">{t('bookingDetail.cashPlusCodeOrReceipt')}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {showUploadAction && (
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    <Button disabled={uploading} className="h-12 px-6 rounded-xl bg-sunset-orange text-deep-blue hover:bg-sunset-orange-dark hover:text-white border-none text-xs font-black uppercase tracking-widest">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" /> {t('bookingDetail.uploadReceipt')}</>}
                    </Button>
                  </label>
                )}
                <ProofUploadFeedback uploading={uploading || codeSubmitting} hasProof={Boolean(booking.paymentProof)} />
                {showRetryPayment && (
                  <Button asChild variant="outline" className="h-12 px-6 rounded-xl text-xs font-black uppercase tracking-widest">
                    <Link href={retryHref}>
                      {t('bookingDetail.retryPayment')}
                    </Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="h-12 w-12 rounded-xl hover:bg-muted text-muted-foreground border border-border/50"
                  onClick={handleCancel}
                  disabled={!canCancelTravelerBooking(booking.status) || cancelling}
                  aria-label={t('bookingDetail.cancelBooking')}
                >
                  {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
                <div className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${proofStatus.className}`}>
                  <Check className="h-4 w-4" /> {proofLabel}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* #419 (Council P0-16): departure pack — agency emergency
            contact first, OuiBoo escalation during the trip, normal
            support (48h) for everything else. */}
        <TripContactsCard booking={booking} />

        {/* #689 (Council S6): the Booking Pass — this page is the
            receipt; the pass issues on the agency's bank confirmation
            and unlocks the exact meeting point + QR check-in. */}
        <BookingPassCard booking={booking} />

        {/* #688: the agency's Public Verification Record, reachable
            from the booking/receipt surface too. */}
        <VerificationRecord agency={booking.session.template.agency} />

        {/* #693: attendance transparency + dispute path. */}
        {showAttendanceCard && <AttendanceCard booking={booking} />}

        {/* #699: the traveller's end-to-end refund case view. */}
        {refundCaseForBooking && <RefundCaseCard refundCase={refundCaseForBooking} />}


        {/* #417 (Council P0-11): the cancellation scale this booking was
            made under, repeated from the booking confirmation. */}
        <CancellationScaleCard
          scale={booking.cancellationScale}
          baseAmount={Number(booking.totalAmount)}
          currency={booking.currency}
        />

        {(booking.paymentStatus === BookingPaymentStatus.Paid
          || booking.paymentStatus === BookingPaymentStatus.PartiallyPaid)
          && booking.status !== BookingStatus.Cancelled
          && !booking.refundStatus && (
          <Card className="rounded-3xl border border-border shadow-sm bg-card">
            <div className="p-8 space-y-4">
              <h2 className="text-2xl font-black font-display tracking-tight text-foreground">{t('bookingDetail.cancelTitle')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('bookingDetail.cancelBody')}
              </p>
              {cancelRefundState === 'sent' ? (
                <div className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                  {t('bookingDetail.cancelSent')}
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="h-12 px-6 rounded-xl text-xs font-black uppercase tracking-widest"
                    onClick={handleCancelWithRefund}
                    disabled={cancelRefundState === 'sending'}
                  >
                    {cancelRefundState === 'sending'
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : t('bookingDetail.cancelButton')}
                  </Button>
                  {cancelRefundState === 'error' && (
                    <p className="text-sm font-semibold text-danger">{cancelRefundError}</p>
                  )}
                </>
              )}
            </div>
          </Card>
        )}

        {(canReviewBooking || booking.review) && (
          <Card className="rounded-3xl border border-border shadow-sm bg-card">
            <div className="p-8 space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('bookingDetail.reviewTitle')}</p>
                <h2 className="mt-2 text-2xl font-black font-display tracking-tight text-foreground">
                  {booking.review ? t('bookingDetail.reviewThanks') : t('bookingDetail.reviewShare')}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {booking.review
                    ? t('bookingDetail.reviewAttached')
                    : t('bookingDetail.reviewPrompt')}
                </p>
              </div>

              {booking.review ? (
                <div className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                  {t('bookingDetail.reviewSubmitted')}
                </div>
              ) : (
                <ReviewForm bookingId={booking.id} onSuccess={() => {
                  void queryClient.invalidateQueries({ queryKey: ['booking-details-page', bookingId] });
                  void queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
                }} />
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

