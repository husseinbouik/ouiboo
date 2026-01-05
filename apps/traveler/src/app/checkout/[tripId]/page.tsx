'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
  CreditCard, 
  Banknote, 
  UploadCloud, 
  CheckCircle2,
  ChevronLeft,
  X,
  Smartphone,
  MapPin,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@ouiboo/ui/utils';

export default function CheckoutPage() {
  const { tripId } = useParams();
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState('virement');
  const [proof, setProof] = useState<string | null>(null);

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const response = await apiClient.get(`/trips/${tripId}`);
      return response.data;
    }
  });

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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Full Name</Label>
                                <Input placeholder="Abderrahmane..." className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-lg" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Phone Number</Label>
                                <div className="relative">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input placeholder="+212 ..." className="h-14 pl-12 rounded-2xl bg-muted/30 border-none font-bold text-lg" />
                                </div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">CIN or Passport Number</Label>
                                <Input placeholder="Enter document number for insurance" className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-lg" />
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

                        {/* Agency Details Card */}
                        <div className="p-8 rounded-[2.5rem] bg-card border-4 border-dashed border-muted shadow-inner space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{paymentMethod === 'virement' ? 'Bank Information' : 'Cash Details'}</p>
                                    <h3 className="text-xl font-black font-display">{trip.agency?.companyName || 'Sun Travels Morocco'}</h3>
                                </div>
                                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest">Official Account</Badge>
                            </div>
                            
                            {paymentMethod === 'virement' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-6 rounded-2xl">
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">RIB (24 Digits)</p>
                                        <p className="text-md font-mono font-black tracking-widest text-foreground">011 780 0000 1234 5678 9012 34</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Bank Name</p>
                                        <p className="text-md font-bold text-foreground">Attijariwafa Bank</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-amber-50 p-6 rounded-2xl">
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">CIN Receiver</p>
                                        <p className="text-md font-bold text-foreground">AB 123456</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Full Name</p>
                                        <p className="text-md font-bold text-foreground">Sunset Management S.A.R.L</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 pt-4">
                                <p className="text-xs font-black text-foreground uppercase tracking-widest">3. Upload Proof of Payment</p>
                                <div 
                                    className="h-44 border-4 border-dashed border-muted rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:bg-muted/30 transition-all cursor-pointer group"
                                    onClick={() => setProof('https://images.unsplash.com/photo-1614028674026-a65e31bfd27c?q=80&w=2070&auto=format&fit=crop')}
                                >
                                    <AnimatePresence mode="wait">
                                        {proof ? (
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.9 }} 
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="relative w-full h-full p-4"
                                            >
                                                <img src={proof} className="w-full h-full object-cover rounded-xl" alt="Proof" />
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setProof(null); }}
                                                    className="absolute top-6 right-6 h-8 w-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black transition-all"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </motion.div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <UploadCloud className="h-10 w-10 text-muted-foreground group-hover:scale-110 transition-transform" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Click to upload receipt photo</span>
                                            </div>
                                        )}
                                    </AnimatePresence>
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
                          <span className="font-black">May 12 - May 15</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Guest Count</span>
                          <span className="font-black">1 Traveler</span>
                      </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-border/50">
                      <div className="flex justify-between items-center">
                          <span className="text-muted-foreground font-medium">Subtotal</span>
                          <span className="font-bold">1,200.00 MAD</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-muted-foreground font-medium">Service Fee</span>
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-50 font-black text-[8px] uppercase tracking-widest">Free</Badge>
                      </div>
                      <div className="flex justify-between items-end pt-4 border-t border-border/50">
                          <span className="text-lg font-black font-display tracking-tight text-foreground">Total to pay</span>
                          <div className="text-right">
                              <span className="text-4xl font-black font-display text-primary tracking-tighter leading-none block">1,200.00</span>
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Dirhams</span>
                          </div>
                      </div>
                  </div>
               </div>

               <Button 
                disabled={!proof}
                className="w-full h-20 rounded-[2rem] text-xl font-black bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 border-none group px-10"
               >
                   Complete Booking <CheckCircle2 className="h-6 w-6 ml-4 group-hover:scale-110 transition-transform" />
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
