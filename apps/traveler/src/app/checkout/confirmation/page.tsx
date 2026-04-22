'use client';

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button, Card, CardContent, Badge } from '@ouiboo/ui';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, Clock, UploadCloud } from 'lucide-react';
import { cn } from '@ouiboo/ui/utils';
import { BookingStatus, type BookingDetails } from '@ouiboo/types';

type VerifyPaymentResult = {
  status: 'success' | 'failure' | 'pending';
};

export default function CheckoutConfirmationPage() {
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
      title: 'Pending payment',
      description: isCancelled
        ? 'The online payment was cancelled before confirmation.'
        : isConfirmed
        ? 'Your payment has been processed successfully.'
        : isGatewayVerificationInProgress
        ? 'We are confirming your payment with the gateway right now.'
        : 'Your payment is waiting for review or gateway confirmation.',
      icon: Clock,
      state: hasUploadedProof || isConfirmed ? 'complete' : isCancelled ? 'pending' : 'active'
    },
    {
      title: 'Payment proof uploaded',
      description: 'We have received your receipt and attached it to the booking.',
      icon: UploadCloud,
      state: hasUploadedProof ? 'complete' : 'pending'
    },
    {
      title: 'Agency verification',
      description: isCancelled
        ? 'You can safely retry the payment from your bookings page.'
        : isConfirmed
        ? 'Your booking is confirmed and the agency has approved the payment.'
        : 'The agency will confirm availability and validate the payment.',
      icon: ShieldCheck,
      state: isConfirmed ? 'complete' : 'pending'
    }
  ];

  return (
    <div className="min-h-screen bg-muted/30 pt-28 pb-24">
      <div className="max-w-3xl mx-auto px-6">
        <Card className="border-none shadow-2xl shadow-black/10 rounded-[3rem] overflow-hidden">
          <CardContent className="p-10 space-y-10">
            <div className="text-center space-y-4">
              <div className="mx-auto h-20 w-20 rounded-[2rem] bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <Badge className="mx-auto bg-emerald-500/10 text-emerald-700 border-none px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest">
                {isCancelled ? 'Payment cancelled' : isConfirmed ? 'Booking confirmed' : 'Booking submitted'}
              </Badge>
              <h1 className="text-4xl font-black font-display tracking-tight text-foreground">
                {isCancelled ? 'Your payment was cancelled.' : isConfirmed ? 'Your booking is confirmed.' : 'Thanks! Your booking is being processed.'}
              </h1>
              <p className="text-muted-foreground font-medium text-lg">
                {tripTitle
                  ? `Trip: ${tripTitle}. ${isCancelled ? 'You can retry payment from your bookings page whenever you are ready.' : isConfirmed ? 'You are all set for departure.' : 'We will notify you once the agency confirms the payment and availability.'}`
                  : isCancelled ? 'You can retry payment from your bookings page whenever you are ready.' : 'We will notify you once the agency confirms the payment and availability.'}
              </p>
              {bookingReference && (
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Booking reference: {bookingReference}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-foreground">Confirmation status</p>
              {isLoading && (
                <div className="rounded-[2rem] border border-border/60 bg-muted/20 px-5 py-4 text-sm font-semibold text-muted-foreground">
                  Loading your latest booking status...
                </div>
              )}
              {isGatewayVerificationInProgress && (
                <div className="rounded-[2rem] border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-700 flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizing your gateway payment...
                </div>
              )}
              {verifyPaymentMutation.isError && (
                <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700 flex items-center gap-3">
                  <AlertCircle className="h-4 w-4" />
                  We could not confirm the payment automatically yet. Please check your bookings page in a moment.
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
                        item.state === 'complete' ? "border-emerald-200 bg-emerald-50" : "border-border/60 bg-muted/20"
                      )}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-2xl flex items-center justify-center",
                          item.state === 'complete' ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
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
                <Link href={retryCheckoutHref} className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto h-14 px-8 rounded-[1.5rem] bg-sunset-orange hover:bg-orange-600 text-white font-black border-none">
                    Retry payment
                  </Button>
                </Link>
              )}
              <Link href="/bookings" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-14 px-8 rounded-[1.5rem] bg-deep-blue dark:bg-slate-900 text-white font-black">
                  View my bookings
                </Button>
              </Link>
              <Link href="/" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-[1.5rem] font-black">
                  Back to home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
