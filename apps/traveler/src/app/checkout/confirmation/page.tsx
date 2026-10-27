'use client';

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { Button, Card, CardContent, Badge } from '@ouiboo/ui';
import { AlertCircle, CheckCircle2, Loader2, Landmark, Clock, UploadCloud } from 'lucide-react';
import { cn } from '@ouiboo/ui/utils';
import { BookingStatus, type BookingDetails } from '@ouiboo/types';
import SellerIdentity from '@/components/SellerIdentity';

type VerifyPaymentResult = {
  status: 'success' | 'failure' | 'pending';
};

export default function CheckoutConfirmationPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isProofUploaded = searchParams.get('proof') === '1';
  const bookingId = searchParams.get('bookingId');
  const provider = searchParams.get('provider');
  const gatewayStatus = searchParams.get('gatewayStatus');
  const returnTransactionId = searchParams.get('transactionId');

  const { data: booking, isLoading } = useQuery<BookingDetails | null>({
    enabled: Boolean(bookingId),
    queryKey: ['booking-confirmation', bookingId],
    queryFn: async () => {
      if (!bookingId) {
        return null;
      }

      const response = await apiClient.get(`/bookings/${bookingId}`);
      return response.data;
    },
  });

  const verifyPaymentMutation = useMutation<VerifyPaymentResult, Error, { bookingId: string; provider: string; transactionId: string }>({
    mutationFn: async ({ bookingId: id, provider: paymentProvider, transactionId }) => {
      const response = await apiClient.post('/payments/verify', {
        bookingId: id,
        provider: paymentProvider,
        transactionId,
      });
      return response.data;
    },
    onSuccess: async () => {
      if (bookingId) {
        await queryClient.invalidateQueries({ queryKey: ['booking-confirmation', bookingId] });
      }
    },
  });

  React.useEffect(() => {
    const normalizedProvider = provider?.toUpperCase();
    const transactionId = returnTransactionId || booking?.paymentGatewayTransactionId;
    const isGatewayPaymentPendingConfirmation = booking
      && booking.status !== BookingStatus.Confirmed
      && booking.status !== BookingStatus.Cancelled
      && booking.status !== BookingStatus.Rejected
      && booking.paymentMethod === 'GATEWAY';

    if (
      bookingId
      && normalizedProvider
      && gatewayStatus === 'success'
      && transactionId
      && isGatewayPaymentPendingConfirmation
      && !verifyPaymentMutation.isPending
      && !verifyPaymentMutation.isSuccess
    ) {
      verifyPaymentMutation.mutate({
        bookingId,
        provider: normalizedProvider,
        transactionId,
      });
    }
  }, [
    booking,
    bookingId,
    gatewayStatus,
    provider,
    queryClient,
    returnTransactionId,
    verifyPaymentMutation,
  ]);

  const hasUploadedProof = booking?.paymentProof || isProofUploaded;
  const isConfirmed = booking?.status === BookingStatus.Confirmed;
  const isCancelled = booking?.status === BookingStatus.Cancelled || gatewayStatus === 'cancelled';
  const isGatewayVerificationInProgress = verifyPaymentMutation.isPending;
  const tripTitle = booking?.session?.template?.title;
  const bookingReference = booking?.id || bookingId;
  const retryCheckoutHref = booking
    ? `/checkout/${booking.session.template.id}?session=${booking.session.id}&guests=${booking.guestsCount}&retryBooking=${booking.id}`
    : null;

  const statusItems = [
    {
      title: t('checkout.statusPendingTitle'),
      description: isCancelled
        ? t('checkout.confirmation.pendingCancelled')
        : isConfirmed
        ? t('checkout.confirmation.pendingConfirmed')
        : isGatewayVerificationInProgress
        ? t('checkout.confirmation.pendingVerifying')
        : t('checkout.confirmation.pendingWaiting'),
      icon: Clock,
      state: hasUploadedProof || isConfirmed ? 'complete' : isCancelled ? 'pending' : 'active'
    },
    {
      title: t('checkout.statusProofTitle'),
      description: t('checkout.confirmation.proofReceived'),
      icon: UploadCloud,
      state: hasUploadedProof ? 'complete' : 'pending'
    },
    {
      title: t('checkout.confirmation.agencyVerification'),
      description: isCancelled
        ? t('checkout.confirmation.agencyCancelledNote')
        : isConfirmed
        ? t('checkout.confirmation.agencyConfirmedNote')
        : t('checkout.confirmation.agencyPendingNote'),
      icon: Landmark,
      state: isConfirmed ? 'complete' : 'pending'
    }
  ];

  return (
    <div className="min-h-screen bg-muted/30 pt-28 pb-24">
      <div className="max-w-3xl mx-auto px-6">
        <Card className="border-none shadow-2xl shadow-black/10 rounded-[3rem] overflow-hidden">
          <CardContent className="p-10 space-y-10">
            <div className="text-center space-y-4">
              <div className="mx-auto h-20 w-20 rounded-[2rem] bg-success/10 text-success flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <Badge className="mx-auto bg-success/10 text-success border-none px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest">
                {isCancelled ? t('checkout.confirmation.paymentCancelledBadge') : isConfirmed ? t('checkout.confirmation.bookingConfirmedBadge') : t('checkout.confirmation.bookingSubmittedBadge')}
              </Badge>
              <h1 className="text-4xl font-black font-display tracking-tight text-foreground">
                {isCancelled ? t('checkout.confirmation.cancelledTitle') : isConfirmed ? t('checkout.confirmation.confirmedTitle') : t('checkout.confirmation.submittedTitle')}
              </h1>
              <p className="text-muted-foreground font-medium text-lg">
                {tripTitle ? t('checkout.confirmation.tripLine', { title: tripTitle }) : ''}
                {isCancelled ? t('checkout.confirmation.cancelledNote') : isConfirmed ? t('checkout.confirmation.confirmedNote') : t('checkout.confirmation.submittedNote')}
              </p>
              {bookingReference && (
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {t('checkout.confirmation.bookingReference', { reference: bookingReference })}
                </p>
              )}
              {/* B4 (Council Session #2): the Law 31-08 seller identity
                  block on the immediate booking confirmation — the same
                  block the durable booking page and the email carry. */}
              {booking?.session?.template?.agency && (
                <SellerIdentity agency={booking.session.template.agency} className="text-left" />
              )}
            </div>

            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-foreground">{t('checkout.confirmation.statusTitle')}</p>
              {isLoading && (
                <div className="rounded-[2rem] border border-border/60 bg-muted/20 px-5 py-4 text-sm font-semibold text-muted-foreground">
                  {t('checkout.confirmation.loadingStatus')}
                </div>
              )}
              {isGatewayVerificationInProgress && (
                <div className="rounded-[2rem] border border-ocean-500/20 bg-ocean-500/10 px-5 py-4 text-sm font-semibold text-ocean-700 dark:text-ocean-300 flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('checkout.confirmation.finalizingGateway')}
                </div>
              )}
              {verifyPaymentMutation.isError && (
                <div className="rounded-[2rem] border border-danger/20 bg-danger/10 px-5 py-4 text-sm font-semibold text-danger flex items-center gap-3">
                  <AlertCircle className="h-4 w-4" />
                  {t('checkout.confirmation.gatewayError')}
                </div>
              )}
              <div className="space-y-3">
                {statusItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className={cn(
                        "flex items-start gap-4 rounded-[2rem] border p-5",
                        item.state === 'complete' ? "border-success/20 bg-success/10" : "border-border/60 bg-muted/20"
                      )}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-2xl flex items-center justify-center",
                          item.state === 'complete' ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-foreground">{item.title}</p>
                        <p className="text-[11px] font-medium text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

              <div className="flex flex-col sm:flex-row gap-4">
              {isCancelled && retryCheckoutHref && (
                <Button asChild className="w-full sm:w-auto h-14 px-8 rounded-[1.5rem] bg-sunset-orange hover:bg-orange-600 text-white font-black border-none">
                  <Link href={retryCheckoutHref} className="w-full sm:w-auto">
                    {t('checkout.confirmation.retryPayment')}
                  </Link>
                </Button>
              )}
              <Button asChild className="w-full sm:w-auto h-14 px-8 rounded-[1.5rem] bg-deep-blue dark:bg-card text-white font-black">
              <Link href="/bookings">{t('checkout.confirmation.viewBookings')}</Link>
            </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-[1.5rem] font-black">
              <Link href="/">{t('checkout.confirmation.backHome')}</Link>
            </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

