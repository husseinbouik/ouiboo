'use client';

import type { AxiosError } from 'axios';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/AuthContext';
import { type BookingDetails } from '@ouiboo/types';
import { 
  Card, 
  CardContent, 
  Button, 
  Input, 
  Label, 
  RadioGroup,
  RadioGroupItem,
  Badge
} from '@ouiboo/ui';
import { 
  Calendar, 
  Users, 
  Info, 
  ShieldCheck, 
  Banknote, 
  UploadCloud, 
  CheckCircle2,
  ChevronLeft,
  X,
  Smartphone,
  MapPin,
  Lock,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@ouiboo/ui/utils';
import { formatCurrency } from '@ouiboo/utils';
import { useTranslation } from 'react-i18next';

type ApiErrorResponse = {
  message?: string;
};

type CheckoutTripSession = {
  availableSeats: number;
  endDate: string;
  id: string;
  price: number | string;
  currency: string;
  startDate: string;
};

type CheckoutTrip = {
  agency?: {
    bankDetails?: string | null;
    companyName?: string | null;
  } | null;
  images?: string[];
  sessions?: CheckoutTripSession[];
  startLocation: string;
  title: string;
};

type BookingResponse = {
  id: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    return axiosError.response?.data?.message || axiosError.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export default function CheckoutPage() {
  const { tripId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoading: isAuthLoading } = useAuth();
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
  const [documentNumberOverride, setDocumentNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    ?? '';
  const phoneNumber = phoneNumberOverride ?? retryBooking?.phoneNumber ?? '';
  const documentNumber = documentNumberOverride ?? retryBooking?.documentNumber ?? '';
  const selectedSession = trip?.sessions?.find((session) => session.id === selectedSessionId);
  const sessionPrice = Number(selectedSession?.price ?? 0);
  const totalPrice = sessionPrice * guestCount;
  const selectedCurrency = selectedSession?.currency;
  const bankDetails = trip?.agency?.bankDetails?.trim() ?? '';
  const hasBankDetails = bankDetails.length > 0;
  const sessionDateLabel = selectedSession
    ? `${new Date(selectedSession.startDate).toLocaleDateString()} - ${new Date(selectedSession.endDate).toLocaleDateString()}`
    : 'Select a session';

  const createBookingMutation = useMutation<BookingResponse, Error>({
    mutationFn: async () => {
      setErrorMessage(null);
      if (!selectedSessionId) {
        throw new Error('Session is required');
      }
      if (!fullName.trim() || !phoneNumber.trim() || !documentNumber.trim()) {
        throw new Error('Guest contact details are required');
      }
      if (!hasBankDetails) {
        throw new Error('This agency has not configured verified bank transfer instructions yet');
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
          documentNumber: documentNumber.trim(),
          paymentMethod: 'BANK_TRANSFER',
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
      setErrorMessage(getErrorMessage(error, 'Unable to complete booking'));
    }
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

  if (isLoading || isAuthLoading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse">Initializing Security...</div>;
  if (!trip) return <div className="min-h-screen flex items-center justify-center font-black">Trip not found.</div>;

  return (
    <div className="min-h-screen bg-muted/20 pb-40">
      <div className="max-w-7xl mx-auto px-6 pt-32">
        <div className="flex items-center gap-4 mb-12">
            <Button variant="ghost" onClick={() => router.back()} className="rounded-xl h-12 w-12 p-0">
                <ChevronLeft className="h-6 w-6" />
            </Button>
            <div>
                <h1 className="text-4xl font-black font-display tracking-tight">Checkout</h1>
                <p className="text-muted-foreground font-medium flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" /> Secure Manual Payment Process
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left: Form */}
          <div className="lg:col-span-8 space-y-8">
            <Card className="border-none shadow-xl shadow-black/5 rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-10 space-y-10">
                    <div className="space-y-6">
                        {retryBooking && (
                            <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Retry payment</p>
                                <p className="mt-2 text-sm font-semibold text-amber-900">
                                    We restored your last booking details from reference {retryBooking.id.slice(0, 8)} so you can retry payment without re-entering everything.
                                </p>
                            </div>
                        )}
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-black">1</div>
                            <h2 className="text-2xl font-black font-display">Guest Details</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="md:col-span-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Session</Label>
                                <RadioGroup 
                                    value={selectedSessionId || ''} 
                                    onValueChange={setSelectedSessionId}
                                    className="mt-3 grid grid-cols-1 gap-3"
                                >
                                    {trip.sessions?.length ? trip.sessions.map((session) => (
                                        <div 
                                            key={session.id}
                                            onClick={() => setSelectedSessionId(session.id)}
                                            className={cn(
                                                "flex items-center justify-between rounded-2xl border p-4 text-sm font-semibold transition-all",
                                                selectedSessionId === session.id ? "border-primary bg-primary/5" : "border-border/50 hover:bg-muted/40"
                                            )}
                                        >
                                            <div>
                                                <p className="font-black">{new Date(session.startDate).toLocaleDateString()} - {new Date(session.endDate).toLocaleDateString()}</p>
                                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{session.availableSeats} seats left</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="text-[10px] font-black">{formatCurrency(session.price, session.currency, i18n.language)}</Badge>
                                                <RadioGroupItem value={session.id} />
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                                            No upcoming sessions are available yet.
                                        </div>
                                    )}
                                </RadioGroup>
                            </div>
                            <div>
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Guest Count</Label>
                                <Input 
                                    type="number" 
                                    min={1}
                                    value={guestCount}
                                    onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
                                    className="mt-3 h-14 rounded-2xl bg-muted/30 border-none font-bold text-lg text-center"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Full Name</Label>
                                <Input
                                    placeholder="Abderrahmane..."
                                    className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-lg"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Phone Number</Label>
                                <div className="relative">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        placeholder="Include country code"
                                        className="h-14 pl-12 rounded-2xl bg-muted/30 border-none font-bold text-lg"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">CIN or Passport Number</Label>
                                <Input
                                    placeholder="Enter document number for insurance"
                                    className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-lg"
                                    value={documentNumber}
                                    onChange={(e) => setDocumentNumber(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8 pt-10 border-t">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">2</div>
                            <h2 className="text-2xl font-black font-display">Bank Transfer</h2>
                        </div>

                        <div className={cn(
                            "p-6 rounded-[2rem] border-2 space-y-4",
                            hasBankDetails ? "border-primary/20 bg-primary/5" : "border-rose-200 bg-rose-50"
                        )}>
                            <div className="flex items-center gap-3">
                                <Banknote className={cn("h-8 w-8", hasBankDetails ? "text-primary" : "text-rose-600")} />
                                <div>
                                    <h4 className="font-black text-lg">Virement Bancaire</h4>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                        {hasBankDetails ? 'Use the verified instructions below' : 'Payment instructions unavailable'}
                                    </p>
                                </div>
                            </div>
                            {hasBankDetails ? (
                                <>
                                        <div className="flex items-center gap-2 text-primary">
                                            <Info className="h-4 w-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Official Bank Instructions</span>
                                        </div>
                                        <div className="bg-card/70 p-4 rounded-xl font-mono text-sm whitespace-pre-wrap break-all leading-relaxed">
                                            {bankDetails}
                                        </div>
                                        <div className="p-4 bg-amber-50 rounded-xl flex gap-3 items-center">
                                            <div className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">
                                                Payment proof is required within 24 hours of booking. Reservations without proof are canceled automatically.
                                            </p>
                                        </div>
                                </>
                            ) : (
                                <p className="text-sm font-semibold text-rose-700">
                                    Booking is temporarily unavailable. The agency must configure its bank details before accepting payments.
                                </p>
                            )}
                        </div>

                            <div className="space-y-4 pt-4">
                                <div className="flex justify-between items-end">
                                    <p className="text-xs font-black text-foreground uppercase tracking-widest">3. Upload Proof of Payment</p>
                                    <Badge variant="outline" className="text-[8px] font-black border-primary/20 text-primary">Upload within 24h</Badge>
                                </div>
                                <label className="h-44 border-4 border-dashed border-muted rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer group">
                                    <input type="file" className="hidden" onChange={handleProofUpload} disabled={createBookingMutation.isPending} accept="image/*,application/pdf" />
                                    <AnimatePresence mode="wait">
                                        {proofPreview ? (
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.9 }} 
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="relative w-full h-full p-4"
                                            >
                                                <Image src={proofPreview} className="w-full h-full object-cover rounded-xl" alt="Proof" fill sizes="(min-width: 1024px) 40vw, 100vw" unoptimized />
                                                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                                    <p className="text-white font-black text-xs">Change Photo</p>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); clearProof(); }}
                                                    className="absolute top-6 right-6 h-8 w-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black transition-all"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </motion.div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <UploadCloud className="h-10 w-10 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">Click to upload transfer receipt</span>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </label>
                                <p className="text-[10px] text-muted-foreground text-center font-medium italic">You can upload later from My Bookings. Reservations without proof are canceled after 24 hours.</p>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-border/50">
                                <p className="text-xs font-black text-foreground uppercase tracking-widest">Payment Status</p>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                                        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", proofFile ? "bg-success/100 text-white" : "bg-amber-500 text-white")}>
                                            {proofFile ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-foreground">Pending payment</p>
                                            <p className="text-[10px] font-medium text-muted-foreground">We are waiting for your transfer to be initiated.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                                        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", proofFile ? "bg-success/100 text-white" : "bg-muted text-muted-foreground")}>
                                            <UploadCloud className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-foreground">Payment proof uploaded</p>
                                            <p className="text-[10px] font-medium text-muted-foreground">Upload your receipt to lock in your reservation.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                                        <div className="h-8 w-8 rounded-xl flex items-center justify-center bg-muted text-muted-foreground">
                                            <ShieldCheck className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-foreground">Agency verification</p>
                                            <p className="text-[10px] font-medium text-muted-foreground">Confirmation is sent once the agency verifies your payment.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="p-8 bg-ocean-500/10 rounded-[2.5rem] border border-ocean-500/20 flex gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-ocean-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-ocean-500/20"><Info className="h-6 w-6" /></div>
                    <div className="space-y-1">
                        <h4 className="font-black text-blue-900 dark:text-blue-200 uppercase text-[10px] tracking-widest">Important Disclaimer</h4>
                        <p className="text-sm text-ocean-700 dark:text-ocean-300 dark:text-blue-300 font-medium leading-relaxed">Your booking will be marked as &quot;Pending Verification&quot; until the agency confirms receipt of your payment manually. This usually takes 2-4 business hours.</p>
                    </div>
                </div>
            </div>

            {/* Right: Summary */}
            <div className="lg:col-span-4 sticky top-32">
                <Card className="border-none shadow-2xl shadow-black/10 rounded-[3rem] overflow-hidden p-10 space-y-8 bg-card ring-1 ring-border/50">
                   <div className="space-y-6">
                      <div className="flex gap-4">
                         <div className="h-20 w-20 rounded-2xl overflow-hidden shrink-0 shadow-lg">
                            <Image src={trip.images?.[0] || 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?q=80&w=1200&auto=format&fit=crop'} className="w-full h-full object-cover" alt={trip.title} width={80} height={80} />
                         </div>
                     <div className="space-y-1">
                        <h3 className="font-black text-lg leading-tight line-clamp-2">{trip.title}</h3>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            <MapPin className="h-3 w-3 text-sunset-orange" /> {trip.startLocation}
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-border/50">
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> Selected Date</span>
                          <span className="font-black">{sessionDateLabel}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Guest Count</span>
                          <span className="font-black">{guestCount} Traveler{guestCount > 1 ? 's' : ''}</span>
                      </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-border/50">
                      <div className="flex justify-between items-center">
                          <span className="text-muted-foreground font-medium">Subtotal</span>
                          <span className="font-bold">{formatCurrency(totalPrice, selectedCurrency, i18n.language)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-muted-foreground font-medium">Service Fee</span>
                          <Badge variant="outline" className="border-emerald-500/30 text-success bg-success/10 font-black text-[8px] uppercase tracking-widest">Free</Badge>
                      </div>
                      <div className="flex justify-between items-end pt-4 border-t border-border/50">
                          <span className="text-lg font-black font-display tracking-tight text-foreground">Total to pay</span>
                          <div className="text-right">
                              <span className="text-3xl font-black font-display text-primary tracking-tighter leading-none block">{formatCurrency(totalPrice, selectedCurrency, i18n.language)}</span>
                          </div>
                      </div>
                  </div>
               </div>

               {errorMessage && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-xs font-semibold text-rose-700">
                  {errorMessage}
                </div>
               )}

               <Button 
                disabled={
                  !selectedSessionId ||
                  !hasBankDetails ||
                  !fullName.trim() ||
                  !phoneNumber.trim() ||
                  !documentNumber.trim() ||
                  createBookingMutation.isPending
                }
                onClick={() => createBookingMutation.mutate()}
                className="w-full h-20 rounded-[2rem] text-xl font-black bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 border-none group px-10"
               >
                   {createBookingMutation.isPending ? 'Submitting booking...' : 'Complete Booking'} <CheckCircle2 className="h-6 w-6 ml-4 group-hover:scale-110 transition-transform" />
               </Button>

               <div className="flex items-center justify-center gap-4 pt-4 opacity-50">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Moroccan Tourism Protection</span>
               </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


