'use client';

import React, { useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
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
import { Button, Input, Card, CardContent } from '@ouiboo/ui';
import Link from 'next/link';

export default function BookingPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [guestsCount, setGuestsCount] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const { data: trip } = useQuery({
    queryKey: ['trip', id],
    queryFn: async () => {
      const response = await apiClient.get(`/trips/${id}`);
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
      const response = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      uploadProofMutation.mutate(response.data.url);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-12">
           <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-deep-blue">
              <ChevronLeft className="h-4 w-4" /> Back
           </button>
           <div className="flex gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-1.5 w-12 rounded-full transition-all duration-500 ${i <= step ? "bg-sunset-orange" : "bg-gray-200"}`}></div>
              ))}
           </div>
           <div className="w-10"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
           <div className="lg:col-span-2 space-y-8">
              {step === 1 && (
                <section className="space-y-8 animate-in fade-in slide-in-from-bottom duration-500">
                   <div className="space-y-2">
                      <h1 className="text-3xl font-black text-deep-blue">Step 1: Your Trip</h1>
                      <p className="text-gray-500">How many people are coming with you?</p>
                   </div>
                   
                   <Card className="border-none shadow-sm p-6 rounded-3xl bg-white">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-sunset-orange/10 rounded-2xl flex items-center justify-center">
                               <Users className="h-6 w-6 text-sunset-orange" />
                            </div>
                            <div>
                               <p className="font-bold text-deep-blue">Guests</p>
                               <p className="text-xs text-gray-500">Price: {selectedSessionData?.price} MAD / person</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <button 
                              onClick={() => setGuestsCount(Math.max(1, guestsCount - 1))}
                              className="h-10 w-10 border-2 border-gray-100 rounded-xl flex items-center justify-center font-bold hover:border-sunset-orange"
                            >-</button>
                            <span className="font-black text-xl w-4 text-center">{guestsCount}</span>
                            <button 
                              onClick={() => setGuestsCount(guestsCount + 1)}
                              className="h-10 w-10 border-2 border-gray-100 rounded-xl flex items-center justify-center font-bold hover:border-sunset-orange"
                            >+</button>
                         </div>
                      </div>
                   </Card>

                   <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex gap-4">
                      <Info className="h-6 w-6 text-deep-blue shrink-0" />
                      <div className="space-y-1">
                         <p className="font-bold text-deep-blue text-sm">Booking policy</p>
                         <p className="text-xs text-gray-600 leading-relaxed">
                            Once you book, the agency will hold your spot for 24 hours while you complete the payment transfer. Spots are confirmed upon proof of payment.
                         </p>
                      </div>
                   </div>

                   <Button 
                    onClick={() => createBookingMutation.mutate()}
                    disabled={createBookingMutation.isPending}
                    className="w-full h-16 bg-deep-blue hover:bg-blue-900 border-none rounded-2xl text-lg font-black shadow-xl"
                   >
                     {createBookingMutation.isPending ? 'Processing...' : 'Reserve Spot'}
                   </Button>
                </section>
              )}

              {step === 2 && (
                <section className="space-y-8 animate-in fade-in slide-in-from-bottom duration-500">
                   <div className="space-y-2">
                      <h1 className="text-3xl font-black text-deep-blue">Step 2: Payment</h1>
                      <p className="text-gray-500">Complete the transfer to confirm your booking.</p>
                   </div>
                   
                   <Card className="border-none shadow-sm p-8 rounded-3xl bg-white space-y-6">
                      <div className="flex items-center gap-3 pb-6 border-b border-gray-50">
                         <CreditCard className="h-6 w-6 text-sunset-orange" />
                         <h2 className="text-xl font-bold text-deep-blue">Bank Transfer Details</h2>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bank Name</p>
                            <p className="font-black text-deep-blue">BMCE Bank of Africa</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Name</p>
                            <p className="font-black text-deep-blue">Ouiboo Experiences SARL</p>
                         </div>
                         <div className="col-span-1 md:col-span-2 space-y-1">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">RIB (Account Number)</p>
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                               <p className="font-mono font-bold text-deep-blue">011 780 000000000 00000 00</p>
                               <Button variant="outline" className="h-8 text-xs font-bold px-4">Copy</Button>
                            </div>
                         </div>
                      </div>
                   </Card>

                   <div className="space-y-4">
                      <p className="text-sm font-bold text-gray-900 uppercase">Upload Proof of Payment</p>
                      <label className="block border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center space-y-4 bg-white hover:border-sunset-orange transition-all cursor-pointer group">
                         <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                         <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                            {uploading ? <div className="animate-spin h-6 w-6 border-2 border-sunset-orange border-t-transparent rounded-full" /> : <Upload className="h-8 w-8 text-gray-400 group-hover:text-sunset-orange" />}
                         </div>
                         <div className="space-y-1">
                            <p className="font-bold text-deep-blue">Click to upload receipt</p>
                            <p className="text-xs text-gray-500">PDF, JPG or PNG (Max 5MB)</p>
                         </div>
                      </label>
                   </div>
                </section>
              )}

              {step === 3 && (
                <section className="text-center space-y-8 animate-in zoom-in duration-500 py-12">
                   <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
                      <Check className="h-12 w-12 text-green-600" />
                   </div>
                   <div className="space-y-2">
                      <h1 className="text-4xl font-black text-deep-blue">Booking Sent!</h1>
                      <p className="text-gray-500 text-lg max-w-md mx-auto">
                        We've received your payment proof. Our team will verify it within 24 hours and send your confirmation email.
                      </p>
                   </div>
                   <div className="pt-8">
                      <Link href="/my-bookings">
                         <Button className="h-16 px-12 bg-deep-blue hover:bg-blue-900 border-none rounded-2xl text-lg font-black shadow-xl">
                            Go to My Bookings
                         </Button>
                      </Link>
                   </div>
                </section>
              )}
           </div>

           {/* Sidebar: Summary */}
           <div className="space-y-6">
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                 <div className="h-32 relative">
                    <img src={trip?.images?.[0]} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                       <p className="text-white font-bold text-sm line-clamp-1">{trip?.title}</p>
                    </div>
                 </div>
                 <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                       <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 flex items-center gap-2"><Calendar className="h-4 w-4" /> Date</span>
                          <span className="font-bold text-deep-blue">{new Date(selectedSessionData?.startDate).toLocaleDateString()}</span>
                       </div>
                       <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 flex items-center gap-2"><Users className="h-4 w-4" /> Travelers</span>
                          <span className="font-bold text-deep-blue">{guestsCount} pax</span>
                       </div>
                    </div>
                    
                    <div className="pt-6 border-t border-gray-50 space-y-3">
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">{selectedSessionData?.price} MAD x {guestsCount}</span>
                          <span className="font-bold text-deep-blue">{(selectedSessionData?.price || 0) * guestsCount} MAD</span>
                       </div>
                       <div className="flex justify-between items-center text-lg font-black text-deep-blue pt-2 border-t border-gray-50">
                          <span>Total</span>
                          <span className="text-sunset-orange">{(selectedSessionData?.price || 0) * guestsCount} MAD</span>
                       </div>
                    </div>
                 </CardContent>
              </Card>
           </div>
        </div>
      </div>
    </div>
  );
}
