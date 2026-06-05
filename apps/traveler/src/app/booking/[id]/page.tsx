'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { BookingStatus, type BookingDetails } from '@ouiboo/types';
import { Badge, Button, Card } from '@ouiboo/ui';
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
import {
  canRetryTravelerPayment,
  canCancelTravelerBooking,
  getTravelerBookingStatusTone,
  getTravelerPaymentStatusMeta,
  getTravelerProofStatus,
  shouldShowUploadAction,
} from '../../bookings/booking-status';
import { ReviewForm } from '@/components/ReviewForm';

export default function BookingDetailsPage() {
  const { id } = useParams();
  const bookingId = Array.isArray(id) ? id[0] : id;
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data: booking, isLoading } = useQuery<BookingDetails | null>({
    enabled: Boolean(bookingId),
    queryKey: ['booking-details-page', bookingId],
    queryFn: async () => {
      if (!bookingId) {
        return null;
      }

      const response = await apiClient.get(`/bookings/${bookingId}`);
      return response.data;
    },
  });

  const uploadProofMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
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

  const handleCancel = () => {
    setCancelling(true);
    cancelBookingMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-sunset-orange" />
        <p className="text-sm font-medium text-muted-foreground">Loading your booking...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <Card className="max-w-xl w-full rounded-[2rem] p-8 text-center">
          <h1 className="text-2xl font-black text-foreground">Booking not found</h1>
          <p className="mt-3 text-muted-foreground">This booking may have been removed or you may not have access to it.</p>
          <Link href="/bookings" className="inline-flex mt-6">
            <Button className="rounded-xl">Back to my bookings</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const tripImage = booking.session.template.images[0] || 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43';
  const proofStatus = getTravelerProofStatus(booking.paymentProof?.status);
  const paymentStatus = getTravelerPaymentStatusMeta(booking.paymentStatus, booking.refundStatus);
  const showUploadAction = shouldShowUploadAction(booking.status, Boolean(booking.paymentProof));
  const showRetryPayment = canRetryTravelerPayment(booking);
  const canReviewBooking = booking.status === BookingStatus.Completed && !booking.review;
  const retryHref = `/checkout/${booking.session.template.id}?session=${booking.session.id}&guests=${booking.guestsCount}&retryBooking=${booking.id}`;

  return (
    <div className="min-h-screen bg-background px-6 pt-28 pb-20">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Booking Reference</p>
            <h1 className="text-4xl font-black font-display tracking-tight text-foreground">{booking.id}</h1>
            <p className="text-muted-foreground mt-2">Review your reservation details, payment state, and next actions.</p>
          </div>
          <Link href="/bookings">
            <Button variant="outline" className="rounded-xl font-bold">Back to my bookings</Button>
          </Link>
        </div>

        <Card className="group border border-border shadow-sm rounded-[2rem] overflow-hidden bg-card">
          <div className="flex flex-col lg:flex-row">
            <div className="w-full lg:w-96 h-64 lg:h-auto overflow-hidden relative">
              <Image
                src={tripImage}
                alt={booking.session.template.title}
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
                  {booking.status.replace('_', ' ')}
                </Badge>
                <Badge className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${paymentStatus.className}`}>
                  {paymentStatus.label}
                </Badge>
              </div>
            </div>

            <div className="p-8 flex-1 space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl font-black text-foreground font-display tracking-tight">{booking.session.template.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-black uppercase tracking-widest">
                      <Calendar className="h-4 w-4 text-sunset-orange" /> Date
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">
                      {format(new Date(booking.session.startDate), 'MMM dd, yyyy')} to {format(new Date(booking.session.endDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-black uppercase tracking-widest">
                      <MapPin className="h-4 w-4 text-blue-500" /> Location
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">{booking.session.template.startLocation}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-black uppercase tracking-widest">
                      <Users className="h-4 w-4 text-sunset-orange" /> Guests
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">{booking.guestsCount} traveler{booking.guestsCount === 1 ? '' : 's'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Traveler Details</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <p><span className="font-black text-foreground">Name:</span> {booking.fullName || booking.traveler.name || 'Not provided'}</p>
                    <p><span className="font-black text-foreground">Email:</span> {booking.traveler.email}</p>
                    <p><span className="font-black text-foreground">Phone:</span> {booking.phoneNumber || 'Not provided'}</p>
                    <p><span className="font-black text-foreground">Document:</span> {booking.documentNumber || 'Not provided'}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Payment Snapshot</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <p><span className="font-black text-foreground">Total:</span> {booking.totalAmount} MAD</p>
                    <p><span className="font-black text-foreground">Method:</span> {booking.paymentMethod}</p>
                    <p><span className="font-black text-foreground">Proof:</span> {proofStatus.label}</p>
                    {booking.refundStatus && (
                      <p><span className="font-black text-foreground">Refund:</span> {booking.refundStatus.replace('_', ' ')}</p>
                    )}
                    {booking.confirmedAt && (
                      <p><span className="font-black text-foreground">Confirmed:</span> {format(new Date(booking.confirmedAt), 'MMM dd, yyyy')}</p>
                    )}
                  </div>
                </div>
              </div>

              {(booking.paymentProof?.rejectionReason || booking.refundStatus) && (
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 text-sm text-muted-foreground">
                  {booking.paymentProof?.rejectionReason && (
                    <p>
                      <span className="font-black text-foreground">Payment proof note:</span> {booking.paymentProof.rejectionReason}
                    </p>
                  )}
                  {booking.refundStatus && (
                    <p className={booking.paymentProof?.rejectionReason ? 'mt-2' : ''}>
                      <span className="font-black text-foreground">Refund status:</span> {booking.refundStatus.replace('_', ' ')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {showUploadAction && (
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    <Button disabled={uploading} className="h-12 px-6 rounded-xl bg-sunset-orange hover:bg-orange-600 border-none text-xs font-black uppercase tracking-widest">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" /> Upload Receipt</>}
                    </Button>
                  </label>
                )}
                {showRetryPayment && (
                  <Link href={retryHref}>
                    <Button variant="outline" className="h-12 px-6 rounded-xl text-xs font-black uppercase tracking-widest">
                      Retry Payment
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  className="h-12 w-12 rounded-xl hover:bg-muted text-muted-foreground border border-border/50"
                  onClick={handleCancel}
                  disabled={!canCancelTravelerBooking(booking.status) || cancelling}
                  aria-label="Cancel booking"
                >
                  {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
                <div className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${proofStatus.className}`}>
                  <Check className="h-4 w-4" /> Proof {proofStatus.label}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {(canReviewBooking || booking.review) && (
          <Card className="rounded-[2rem] border border-border shadow-sm bg-card">
            <div className="p-8 space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trip Review</p>
                <h2 className="mt-2 text-2xl font-black font-display tracking-tight text-foreground">
                  {booking.review ? 'Thanks for reviewing this trip' : 'Share your experience'}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {booking.review
                    ? 'Your review is already attached to this completed booking.'
                    : 'Completed trips can be reviewed once so other travelers can book with confidence.'}
                </p>
              </div>

              {booking.review ? (
                <div className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                  Review submitted successfully.
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

