'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { BookingStatus, type BookingDetails } from '@ouiboo/types';
import { Button, Badge, Card } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import { Calendar, MapPin, Loader2, Upload, Check, Trash2, Clock, Users, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/AuthContext';
import { ReviewForm } from '@/components/ReviewForm';
import {
    canRetryTravelerPayment,
    canCancelTravelerBooking,
    getTravelerBookingStatusTone,
    getTravelerPaymentStatusMeta,
    getTravelerProofStatus,
    shouldShowUploadAction,
} from './booking-status';

export default function MyBookingsPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [reviewModalOpen, setReviewModalOpen] = useState<string | null>(null);

    const { data: bookings = [], isLoading } = useQuery<BookingDetails[]>({
        queryKey: ['my-bookings'],
        queryFn: async () => {
            const response = await apiClient.get('/bookings/my-bookings');
            return response.data;
        },
        enabled: !!user,
    });

    const uploadProofMutation = useMutation({
        mutationFn: async ({ bookingId, file }: { bookingId: string; file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            await apiClient.post(`/bookings/${bookingId}/payment-proof`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
            setUploadingId(null);
        },
        onError: () => {
            setUploadingId(null);
        },
    });

    const cancelBookingMutation = useMutation({
        mutationFn: async (bookingId: string) => {
            await apiClient.patch(`/bookings/${bookingId}/cancel`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
            setCancellingId(null);
        },
        onError: () => {
            setCancellingId(null);
        },
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, bookingId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingId(bookingId);
        uploadProofMutation.mutate({ bookingId, file });
    };

    const handleCancel = (bookingId: string) => {
        setCancellingId(bookingId);
        cancelBookingMutation.mutate(bookingId);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-background gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-sunset-orange" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading your adventures...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-background font-sans text-foreground overflow-hidden relative">
                <div className="max-w-5xl mx-auto px-6 pt-32 pb-20">
                    <div className="text-center py-20 bg-card/70 rounded-[2rem] border border-dashed border-border">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">Sign in to view your bookings</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                            Your trip confirmations, payment proof uploads, and review actions all live here once you are signed in.
                        </p>
                        <div className="mt-6 flex justify-center gap-3">
                            <Link href="/login">
                                <Button>Sign In</Button>
                            </Link>
                            <Link href="/search">
                                <Button variant="outline">Explore Trips</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background font-sans text-foreground overflow-hidden relative">
            <div aria-hidden="true" className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 opacity-20 dark:opacity-10 pointer-events-none">
                <div style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-sunset-orange sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
            </div>

            <div className="max-w-5xl mx-auto px-6 pt-32 pb-20">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-2">My Bookings</h1>
                        <p className="text-lg text-muted-foreground">Manage your past and upcoming trips.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {bookings.length > 0 ? (
                        bookings.map((booking) => {
                            const tripImage = booking.session.template.images[0] || 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43';
                            const proofStatus = getTravelerProofStatus(booking.paymentProof?.status);
                            const paymentStatus = getTravelerPaymentStatusMeta(booking.paymentStatus, booking.refundStatus);
                            const hasPaymentProof = Boolean(booking.paymentProof);
                            const retryHref = `/checkout/${booking.session.template.id}?session=${booking.session.id}&guests=${booking.guestsCount}&retryBooking=${booking.id}`;
                            const showRetryPayment = canRetryTravelerPayment(booking);

                            return (
                                <Card key={booking.id} className="group border border-border shadow-sm hover:shadow-lg transition-all duration-300 rounded-[2rem] overflow-hidden bg-card">
                                    <div className="flex flex-col md:flex-row">
                                        <div className="w-full md:w-72 h-48 md:h-auto overflow-hidden relative">
                                            <div className="absolute inset-0 bg-muted animate-pulse" />
                                            <Image
                                                src={tripImage}
                                                alt="Trip"
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                fill
                                                sizes="(max-width: 768px) 100vw, 18rem"
                                                unoptimized={tripImage.startsWith('http')}
                                            />
                                            <div className="absolute top-4 left-4 flex gap-2">
                                                <Badge className={cn(
                                                    'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl backdrop-blur-md border-none',
                                                    getTravelerBookingStatusTone(booking.status),
                                                )}>
                                                    {booking.status.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="p-8 flex-1 flex flex-col justify-between gap-8">
                                            <div className="space-y-6">
                                                <div className="flex items-start justify-between gap-4">
                                                    <Link href={`/booking/${booking.id}`} className="min-w-0">
                                                        <h3 className="text-2xl font-black text-foreground group-hover:text-sunset-orange transition-colors line-clamp-2 leading-tight font-display tracking-tight">{booking.session.template.title}</h3>
                                                    </Link>
                                                    {shouldShowUploadAction(booking.status, hasPaymentProof) && (
                                                        <div className="shrink-0 flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[10px] font-black uppercase tracking-tighter animate-pulse">
                                                            <Clock className="h-3 w-3" /> Action Required
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-6">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-sunset-orange/10 flex items-center justify-center">
                                                            <Calendar className="h-4 w-4 text-sunset-orange" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Date</span>
                                                            <span className="text-sm font-semibold text-foreground">{format(new Date(booking.session.startDate), 'MMM dd, yyyy')}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-ocean-500/10 flex items-center justify-center">
                                                            <MapPin className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Location</span>
                                                            <span className="text-sm font-semibold text-foreground">{booking.session.template.startLocation}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-8 border-t border-border/50 flex flex-wrap justify-between items-center gap-6">
                                                <div className="flex flex-wrap items-center gap-6">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground bg-muted/30 px-4 py-2 rounded-xl border border-border/50">
                                                        <Users className="h-4 w-4 text-sunset-orange" />
                                                        <span className="text-foreground">{booking.guestsCount}</span> Guest(s)
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-0.5">Total Paid</p>
                                                        <span className="text-2xl font-black text-foreground font-display tracking-tight">{booking.totalAmount} <span className="text-xs font-bold text-muted-foreground ml-1">MAD</span></span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {shouldShowUploadAction(booking.status, hasPaymentProof) && (
                                                        <label className="cursor-pointer">
                                                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, booking.id)} disabled={!!uploadingId} />
                                                            <Button disabled={!!uploadingId} className="h-12 px-8 bg-sunset-orange hover:bg-orange-600 border-none rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-900/10 active:scale-95 transition-all">
                                                                {uploadingId === booking.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" /> Upload Receipt</>}
                                                            </Button>
                                                        </label>
                                                    )}
                                                    {booking.status === BookingStatus.Completed && !booking.review && (
                                                        <Button
                                                            onClick={() => setReviewModalOpen(booking.id)}
                                                            className="h-12 px-8 bg-deep-blue hover:bg-blue-900 rounded-xl text-xs font-black uppercase tracking-widest border-none"
                                                        >
                                                            <Star className="h-4 w-4 mr-2" /> Write Review
                                                        </Button>
                                                    )}
                                                    {booking.review && (
                                                        <Badge className="px-5 py-2.5 rounded-xl text-[10px] font-black bg-success/100/10 text-success border-0">
                                                            Review Submitted
                                                        </Badge>
                                                    )}
                                                    <div className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${paymentStatus.className}`}>
                                                        <Check className="h-4 w-4" /> {paymentStatus.label}
                                                    </div>
                                                    <div className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${proofStatus.className}`}>
                                                        <Check className="h-4 w-4" /> Proof {proofStatus.label}
                                                    </div>
                                                    {showRetryPayment && (
                                                        <Link href={retryHref}>
                                                            <Button
                                                                variant="outline"
                                                                className="h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest border-border/60"
                                                            >
                                                                Retry Payment
                                                            </Button>
                                                        </Link>
                                                    )}
                                                    <Link href={`/booking/${booking.id}`}>
                                                        <Button
                                                            variant="outline"
                                                            className="h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest border-border/60"
                                                        >
                                                            View Details
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-12 w-12 rounded-xl hover:bg-muted text-muted-foreground border border-border/50"
                                                        onClick={() => handleCancel(booking.id)}
                                                        disabled={!canCancelTravelerBooking(booking.status) || cancellingId === booking.id}
                                                        aria-label="Cancel booking"
                                                    >
                                                        {cancellingId === booking.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                            {(booking.refundStatus || booking.paymentProof?.rejectionReason) && (
                                                <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-xs font-semibold text-muted-foreground">
                                                    {booking.refundStatus && (
                                                        <p>
                                                            Refund status: <span className="font-black text-foreground">{booking.refundStatus.replace('_', ' ')}</span>
                                                        </p>
                                                    )}
                                                    {booking.paymentProof?.rejectionReason && (
                                                        <p className="mt-1">
                                                            Proof note: <span className="font-medium">{booking.paymentProof.rejectionReason}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })
                    ) : (
                        <div className="text-center py-20 bg-card/70 rounded-[2rem] border border-dashed border-border">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">No bookings found</h3>
                            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Your upcoming adventures will appear here once you book them.</p>
                        </div>
                    )}
                </div>
            </div>

            {reviewModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-background rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-foreground font-display">Share Your Experience</h2>
                                <p className="text-muted-foreground">Help other travelers by sharing your thoughts about this trip</p>
                            </div>

                            <ReviewForm
                                bookingId={reviewModalOpen}
                                onSuccess={() => setReviewModalOpen(null)}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => setReviewModalOpen(null)}
                        className="fixed inset-0 -z-10"
                        aria-label="Close dialog"
                    />
                </div>
            )}
        </div>
    );
}

