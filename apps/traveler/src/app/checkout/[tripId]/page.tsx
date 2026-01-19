'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
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

export default function CheckoutPage() {
  const { tripId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState('virement');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasInitializedFromQuery = useRef(false);

  useEffect(() => {
    return () => {
      if (proofPreview) {
        URL.revokeObjectURL(proofPreview);
      }
    };
  }, [proofPreview]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const response = await apiClient.get(`/trips/${tripId}`);
      return response.data;
    }
  });

  useEffect(() => {
    if (hasInitializedFromQuery.current) return;

    const sessionParam = searchParams.get('session');
    const parsedGuestsCount = Number(searchParams.get('guests'));
    const hasGuestsCount = Number.isFinite(parsedGuestsCount) && parsedGuestsCount > 0;

    if (sessionParam) {
      setSelectedSessionId(sessionParam);
    } else if (trip?.sessions?.length) {
      setSelectedSessionId(trip.sessions[0].id);
    }

    if (hasGuestsCount) {
      setGuestCount(parsedGuestsCount);
    }

    if (sessionParam || hasGuestsCount || trip?.sessions?.length) {
      hasInitializedFromQuery.current = true;
    }
  }, [searchParams, trip?.sessions]);

  useEffect(() => {
    const sessionFromQuery = searchParams.get('session');
    if (sessionFromQuery) {
      setSelectedSessionId(sessionFromQuery);
    }

    const parsedGuestsCount = Number(searchParams.get('guests'));
    if (Number.isFinite(parsedGuestsCount) && parsedGuestsCount > 0) {
      setGuestCount(parsedGuestsCount);
    }
  }, [searchParams]);

  const selectedSession = trip?.sessions?.find((session: any) => session.id === selectedSessionId);
  const sessionPrice = selectedSession?.price ?? 0;
  const totalPrice = sessionPrice * guestCount;
  const sessionDateLabel = selectedSession
    ? `${new Date(selectedSession.startDate).toLocaleDateString()} - ${new Date(selectedSession.endDate).toLocaleDateString()}`
    : 'Select a session';

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      if (!selectedSessionId) {
        throw new Error('Session is required');
      }
      if (!fullName.trim() || !phoneNumber.trim() || !documentNumber.trim()) {
        throw new Error('Guest contact details are required');
      }

      const response = await apiClient.post('/bookings', {
        sessionId: selectedSessionId,
        guestsCount: guestCount,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        documentNumber: documentNumber.trim()
      });
      const booking = response.data;

      if (proofFile) {
        const formData = new FormData();
        formData.append('file', proofFile);
        await apiClient.post(`/bookings/${booking.id}/payment-proof`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      return booking;
    },
    onSuccess: (data) => {
      router.push(`/checkout/confirmation?bookingId=${data?.id ?? ''}&proof=${proofFile ? '1' : '0'}`);
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message || error?.message || 'Unable to complete booking');
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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse">Initializing Security...</div>;

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
                                    {trip.sessions?.length ? trip.sessions.map((session: any) => (
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
                                                <Badge variant="outline" className="text-[10px] font-black">{session.price} MAD</Badge>
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
                                        placeholder="+212 ..."
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
                            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">2</div>
                            <h2 className="text-2xl font-black font-display">Manual Payment</h2>
                        </div>
                        
                        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div 
                                onClick={() => setPaymentMethod('virement')}
                                className={cn(
                                    "p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col gap-4",
                                    paymentMethod === 'virement' ? "border-primary bg-primary/5" : "border-border/50 hover:bg-muted/50"
                                )}
                            >
                                <div className="flex justify-between items-center">
                                    <Banknote className="h-8 w-8 text-primary" />
                                    <RadioGroupItem value="virement" />
                                </div>
                                <div>
                                    <h4 className="font-black text-lg">Bank Transfer</h4>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Virement Bancaire (RIB)</p>
                                </div>
                            </div>
                            <div 
                                onClick={() => setPaymentMethod('cash')}
                                className={cn(
                                    "p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col gap-4",
                                    paymentMethod === 'cash' ? "border-amber-500 bg-amber-50" : "border-border/50 hover:bg-muted/50"
                                )}
                            >
                                <div className="flex justify-between items-center">
                                    <Smartphone className="h-8 w-8 text-amber-500" />
                                    <RadioGroupItem value="cash" className="border-amber-500 text-amber-500" />
                                </div>
                                <div>
                                    <h4 className="font-black text-lg">Cash / Agency Payment</h4>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">CashPlus / Wafacash</p>
                                </div>
                            </div>
                        </RadioGroup>

                            <AnimatePresence>
                                {paymentMethod === 'virement' && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="p-6 bg-primary/5 rounded-2xl border-2 border-primary/20 space-y-4"
                                    >
                                        <div className="flex items-center gap-2 text-primary">
                                            <Info className="h-4 w-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Official Bank Instructions</span>
                                        </div>
                                        <div className="bg-white/50 p-4 rounded-xl font-mono text-sm whitespace-pre-wrap break-all leading-relaxed">
                                            {trip.agency?.bankDetails || 'Bank Name: Attijariwafa Bank\nRIB: 011 780 0000 1234 5678 9012 34\nAccount Name: Sun Travels Morocco'}
                                        </div>
                                        <div className="p-4 bg-amber-50 rounded-xl flex gap-3 items-center">
                                            <div className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">
                                                Seats are reserved for <span className="text-sm font-black underline">{formatTime(timeLeft)} minutes</span>. Please upload proof before the timer expires.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {paymentMethod === 'cash' && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="p-6 bg-amber-50 rounded-2xl border-2 border-amber-200 space-y-2"
                                    >
                                        <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1 text-center">Cash Payment Details</p>
                                        <p className="text-center font-bold text-amber-900">{trip.agency?.companyName}</p>
                                        <p className="text-center text-xs text-amber-700">Visit any Agency local point or use CashPlus/Wafacash with the details provided by the agency upon arrival.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-4 pt-4">
                                <div className="flex justify-between items-end">
                                    <p className="text-xs font-black text-foreground uppercase tracking-widest">3. Upload Proof of Payment</p>
                                    <Badge variant="outline" className="text-[8px] font-black border-primary/20 text-primary">Required to Confirm</Badge>
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
                                                <img src={proofPreview} className="w-full h-full object-cover rounded-xl" alt="Proof" />
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
                                <p className="text-[10px] text-muted-foreground text-center font-medium italic">Your booking is secured as soon as you upload this proof.</p>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-border/50">
                                <p className="text-xs font-black text-foreground uppercase tracking-widest">Payment Status</p>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                                        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", proofFile ? "bg-emerald-500 text-white" : "bg-amber-500 text-white")}>
                                            {proofFile ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-foreground">Pending payment</p>
                                            <p className="text-[10px] font-medium text-muted-foreground">We are waiting for your transfer to be initiated.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                                        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", proofFile ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}>
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

                <div className="p-8 bg-blue-50 dark:bg-blue-950/20 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/50 flex gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20"><Info className="h-6 w-6" /></div>
                    <div className="space-y-1">
                        <h4 className="font-black text-blue-900 dark:text-blue-200 uppercase text-[10px] tracking-widest">Important Disclaimer</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium leading-relaxed">Your booking will be marked as "Pending Verification" until the agency confirms receipt of your payment manually. This usually takes 2-4 business hours.</p>
                    </div>
                </div>
            </div>

            {/* Right: Summary */}
            <div className="lg:col-span-4 sticky top-32">
                <Card className="border-none shadow-2xl shadow-black/10 rounded-[3rem] overflow-hidden p-10 space-y-8 bg-card ring-1 ring-border/50">
                   <div className="space-y-6">
                      <div className="flex gap-4">
                         <div className="h-20 w-20 rounded-2xl overflow-hidden shrink-0 shadow-lg">
                            <img src={trip.images?.[0]} className="w-full h-full object-cover" alt="" />
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
                          <span className="font-bold">{totalPrice.toFixed(2)} MAD</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-muted-foreground font-medium">Service Fee</span>
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-50 font-black text-[8px] uppercase tracking-widest">Free</Badge>
                      </div>
                      <div className="flex justify-between items-end pt-4 border-t border-border/50">
                          <span className="text-lg font-black font-display tracking-tight text-foreground">Total to pay</span>
                          <div className="text-right">
                              <span className="text-4xl font-black font-display text-primary tracking-tighter leading-none block">{totalPrice.toFixed(2)}</span>
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Dirhams</span>
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
                  !proofFile ||
                  !selectedSessionId ||
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

