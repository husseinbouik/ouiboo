'use client';

import React, { useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { motion } from 'framer-motion';
import { 
  Check, 
  ChevronLeft, 
  CreditCard, 
  Users, 
  Info,
  Calendar,
  Upload,
  AlertCircle
} from 'lucide-react';
import { Button, Input, Card, CardContent, Badge } from '@ouiboo/ui';
import Link from 'next/link';

export default function BookingPage() {
  const { id } = useParams();
  const tripId = Array.isArray(id) ? id[0] : id;
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [guestsCount, setGuestsCount] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const { data: trip } = useQuery({
    queryKey: ['trip', tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const response = await apiClient.get(`/trips/${tripId}`);
      return response.data;
    }
  });

  const selectedSessionData = trip?.sessions?.find((s: any) => s.id === sessionId);

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/bookings', {
        sessionId,
        guestsCount
      });
      return response.data;
    },
    onSuccess: (data) => {
      setBookingId(data.id);
      setStep(2);
    }
  });

  const uploadProofMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const response = await apiClient.post(`/bookings/${bookingId}/payment-proof`, {
        imageUrl
      });
      return response.data;
    },
    onSuccess: () => {
      setStep(3);
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/upload', formData);
      uploadProofMutation.mutate(response.data.url);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-20 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-6">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-16">
           <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="flex items-center gap-2 text-sm font-black text-muted-foreground hover:text-sunset-orange transition-colors group">
              <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" /> Back
           </button>
           <div className="flex gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-2 w-16 rounded-full transition-all duration-700 ${i <= step ? "bg-sunset-orange shadow-lg shadow-sunset-orange/20" : "bg-muted shadow-inner"}`}></div>
              ))}
           </div>
           <div className="w-16"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
           <div className="lg:col-span-8 space-y-12">
              {step === 1 && (
                <section className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                   <div className="space-y-4">
                      <Badge className="bg-sunset-orange/10 text-sunset-orange border-none px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest">Step 01</Badge>
                      <h1 className="text-5xl font-black text-foreground font-display tracking-tight leading-[1.1]">Your Adventure <br />Begins Here</h1>
                      <p className="text-muted-foreground text-xl font-medium">How many people are joining this incredible journey?</p>
                   </div>
                   
                   <Card className="border-none shadow-2xl shadow-deep-blue/5 dark:shadow-none dark:ring-1 dark:ring-border rounded-[2.5rem] p-8 bg-card">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                         <div className="flex items-center gap-6">
                            <div className="h-16 w-16 bg-sunset-orange/10 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                               <Users className="h-8 w-8 text-sunset-orange" />
                            </div>
                            <div>
                               <p className="font-black text-xl text-foreground font-display tracking-tight">Guests</p>
                               <p className="font-bold text-muted-foreground text-sm">Rate: <span className="text-foreground">{selectedSessionData?.price} MAD</span> / person</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-6 bg-muted/50 dark:bg-slate-900 rounded-[2rem] p-3 border border-border/50">
                            <button 
                              onClick={() => setGuestsCount(Math.max(1, guestsCount - 1))}
                              className="h-12 w-12 bg-card rounded-[1.25rem] flex items-center justify-center font-black text-2xl hover:bg-sunset-orange hover:text-white transition-all shadow-sm active:scale-95"
                            >-</button>
                            <span className="font-black text-3xl w-10 text-center font-display">{guestsCount}</span>
                            <button 
                              onClick={() => setGuestsCount(guestsCount + 1)}
                              className="h-12 w-12 bg-card rounded-[1.25rem] flex items-center justify-center font-black text-2xl hover:bg-sunset-orange hover:text-white transition-all shadow-sm active:scale-95"
                            >+</button>
                         </div>
                      </div>
                   </Card>

                   <div className="bg-ocean/5 p-8 rounded-[2.5rem] border border-ocean/10 flex gap-6 shadow-sm">
                      <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm shrink-0">
                        <Info className="h-6 w-6 text-ocean" />
                      </div>
                      <div className="space-y-2">
                         <p className="font-black text-ocean uppercase tracking-widest text-[10px]">Important Booking Information</p>
                         <p className="text-sm text-foreground/70 leading-relaxed font-medium">
                            Upon booking, your spots are reserved for <span className="text-foreground font-bold">24 hours</span>. Please complete the bank transfer within this timeframe and upload your receipt to finalize the confirmation.
                         </p>
                      </div>
                   </div>

                   <Button 
                    onClick={() => createBookingMutation.mutate()}
                    disabled={createBookingMutation.isPending}
                    className="w-full h-20 bg-sunset-orange hover:bg-orange-600 border-none rounded-[2rem] text-2xl font-black shadow-2xl shadow-orange-900/20 active:scale-95 transition-all"
                   >
                     {createBookingMutation.isPending ? 'Preparing your reservation...' : 'Reserve My Adventure'}
                   </Button>
                </section>
              )}

              {step === 2 && (
                <section className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                   <div className="space-y-4">
                      <Badge className="bg-sunset-orange/10 text-sunset-orange border-none px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest">Step 02</Badge>
                      <h1 className="text-5xl font-black text-foreground font-display tracking-tight leading-[1.1]">Payment & <br />Confirmation</h1>
                      <p className="text-muted-foreground text-xl font-medium">Complete the bank transfer below to secure your spots.</p>
                   </div>
                   
                   <Card className="border-none shadow-2xl shadow-deep-blue/5 dark:shadow-none dark:ring-1 dark:ring-border rounded-[3rem] p-10 bg-card space-y-10">
                      <div className="flex items-center gap-4 pb-8 border-b border-border/50">
                         <div className="h-12 w-12 bg-sunset-orange/10 rounded-2xl flex items-center justify-center">
                            <CreditCard className="h-6 w-6 text-sunset-orange" />
                         </div>
                         <h2 className="text-2xl font-black text-foreground font-display tracking-tight">Bank Details</h2>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                         <div className="space-y-2">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Bank Name</p>
                            <p className="text-xl font-black text-foreground font-display">Bank of Africa (BMCE)</p>
                         </div>
                         <div className="space-y-2">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Account Name</p>
                            <p className="text-xl font-black text-foreground font-display">Ouiboo Experiences SARL</p>
                         </div>
                         <div className="col-span-1 md:col-span-2 space-y-3">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">RIB / Account Number</p>
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-muted/50 dark:bg-slate-900 rounded-[2rem] border border-border/50 shadow-inner">
                               <p className="font-mono font-black text-xl text-foreground tracking-wider">011 780 0000000 00000 00</p>
                               <Button variant="outline" className="h-12 font-black px-8 rounded-xl border-dashed hover:bg-sunset-orange hover:text-white transition-all text-xs uppercase tracking-widest active:scale-95">Copy RIB</Button>
                            </div>
                         </div>
                      </div>
                   </Card>

                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-foreground uppercase tracking-widest">Upload Payment Receipt</p>
                        <AlertCircle className="h-4 w-4 text-muted-foreground hover:text-sunset-orange transition-colors cursor-help" />
                      </div>
                      
                      <label className="block border-4 border-dashed border-border/50 rounded-[3rem] p-16 text-center space-y-6 bg-card hover:bg-muted/30 hover:border-sunset-orange/50 transition-all cursor-pointer group shadow-xl shadow-deep-blue/5 dark:shadow-none">
                         <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                         <div className="w-24 h-24 bg-muted rounded-[2rem] flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-sunset-orange/10 group-hover:rotate-12 transition-all duration-500 shadow-inner">
                            {uploading ? (
                                <div className="animate-spin h-10 w-10 border-[5px] border-sunset-orange border-t-transparent rounded-full" />
                            ) : (
                                <Upload className="h-10 w-10 text-muted-foreground group-hover:text-sunset-orange" />
                            )}
                         </div>
                         <div className="space-y-2">
                            <p className="text-2xl font-black text-foreground font-display tracking-tight">Drop your receipt here</p>
                            <p className="text-sm text-muted-foreground font-medium">Supported formats: PDF, JPG, PNG (Max 5MB)</p>
                         </div>
                         <div className="pt-4">
                            <Badge variant="outline" className="px-6 py-2 rounded-full border-muted-foreground/20 text-muted-foreground font-bold group-hover:border-sunset-orange/50 group-hover:text-sunset-orange transition-colors">Select File</Badge>
                         </div>
                      </label>
                   </div>
                </section>
              )}

              {step === 3 && (
                <section className="text-center space-y-10 animate-in zoom-in-95 duration-700 py-16">
                   <div className="relative mx-auto w-32 h-32">
                        <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", damping: 10, stiffness: 100 }}
                            className="w-32 h-32 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20"
                        >
                            <Check className="h-16 w-16 text-white" />
                        </motion.div>
                        <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-emerald-500 rounded-[2.5rem] -z-10"
                        />
                   </div>
                   <div className="space-y-4">
                      <h1 className="text-5xl font-black text-foreground font-display tracking-tight">Booking Sent!</h1>
                      <p className="text-muted-foreground text-xl font-medium max-w-lg mx-auto leading-relaxed">
                        We've received your proof of payment. Our specialists will verify the transfer within <span className="text-foreground font-bold">24 hours</span> and send a confirmation to your email.
                      </p>
                   </div>
                   <div className="pt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                      <Link href="/bookings" className="w-full sm:w-auto">
                         <Button className="h-18 px-14 w-full sm:w-auto bg-deep-blue dark:bg-slate-900 hover:scale-105 active:scale-95 transition-all border-none rounded-[2rem] text-xl font-black shadow-2xl">
                            Go to My Bookings
                         </Button>
                      </Link>
                      <Link href="/" className="w-full sm:w-auto">
                         <Button variant="ghost" className="h-18 px-14 w-full sm:w-auto rounded-[2rem] text-xl font-black hover:bg-muted font-display">
                            Back Home
                         </Button>
                      </Link>
                   </div>
                </section>
              )}
           </div>

           {/* Sidebar: Summary */}
           <div className="lg:col-span-4 relative mt-12 lg:mt-0">
              <div className="sticky top-32 space-y-8">
                  <p className="text-sm font-black text-foreground uppercase tracking-widest ml-4">Booking Summary</p>
                  <Card className="border-none shadow-2xl shadow-deep-blue/5 dark:shadow-none dark:ring-1 dark:ring-border rounded-[3rem] overflow-hidden bg-white dark:bg-slate-900 ring-1 ring-border/50">
                     <div className="h-44 relative group">
                        <img src={trip?.images?.[0] || 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8">
                           <p className="text-white font-black text-xl font-display line-clamp-2 tracking-tight leading-tight">{trip?.title}</p>
                        </div>
                     </div>
                     <CardContent className="p-8 space-y-8">
                        <div className="space-y-5">
                           <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground font-bold flex items-center gap-3"><Calendar className="h-5 w-5 text-sunset-orange" /> Date</span>
                              <span className="font-black text-foreground">{new Date(selectedSessionData?.startDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                           </div>
                           <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground font-bold flex items-center gap-3"><Users className="h-5 w-5 text-sunset-orange" /> Travelers</span>
                              <span className="font-black text-foreground bg-muted dark:bg-slate-800 px-3 py-1 rounded-lg uppercase text-[10px] tracking-widest">{guestsCount} Person(s)</span>
                           </div>
                        </div>
                        
                        <div className="pt-8 border-t border-border/50 space-y-4">
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground font-medium">{selectedSessionData?.price} MAD × {guestsCount}</span>
                              <span className="font-bold text-foreground">{(selectedSessionData?.price || 0) * guestsCount} MAD</span>
                           </div>
                           <div className="flex justify-between items-end pt-4 border-t border-border/50">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Amount</p>
                                <span className="text-4xl font-black text-foreground font-display tracking-tighter">{(selectedSessionData?.price || 0) * guestsCount}</span>
                              </div>
                              <span className="text-sunset-orange font-black text-xl mb-1">MAD</span>
                           </div>
                        </div>

                        <div className="pt-4 flex items-center gap-3 p-4 bg-muted/30 dark:bg-slate-800/30 rounded-2xl border border-border/50">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tight">Best Price Guaranteed</p>
                        </div>
                     </CardContent>
                  </Card>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
