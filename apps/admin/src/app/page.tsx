'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { 
  Users, 
  MapPin, 
  CreditCard, 
  ShieldCheck, 
  XCircle, 
  CheckCircle2, 
  Eye,
  LayoutDashboard,
  Search
} from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@ouiboo/ui';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'AGENCIES' | 'TRIPS' | 'PAYMENTS'>('AGENCIES');
  const queryClient = useQueryClient();

  const { data: pendingAgencies, isLoading: loadingAgencies } = useQuery({
    queryKey: ['pending-agencies'],
    queryFn: async () => {
      const resp = await apiClient.get('/admin/pending-agencies');
      return resp.data;
    }
  });

  const { data: pendingTrips, isLoading: loadingTrips } = useQuery({
    queryKey: ['pending-trips'],
    queryFn: async () => {
      const resp = await apiClient.get('/admin/pending-trips');
      return resp.data;
    }
  });

  const { data: pendingPayments, isLoading: loadingPayments } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: async () => {
      const resp = await apiClient.get('/admin/pending-payments');
      return resp.data;
    }
  });

  const verifyAgencyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      return apiClient.post(`/admin/agencies/${id}/verify`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-agencies'] })
  });

  const verifyTripMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      return apiClient.post(`/admin/trips/${id}/verify`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-trips'] })
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      return apiClient.post(`/admin/payments/${id}/verify`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-payments'] })
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-deep-blue text-white p-6 space-y-8">
         <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 bg-sunset-orange rounded-lg"></div>
            <span className="text-xl font-black tracking-tight">OUIBOO ADMIN</span>
         </div>
         
         <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('AGENCIES')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'AGENCIES' ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}
            >
               <ShieldCheck className="h-5 w-5" />
               <span className="font-bold text-sm text-left">Verify Agencies</span>
            </button>
            <button 
              onClick={() => setActiveTab('TRIPS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'TRIPS' ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}
            >
               <MapPin className="h-5 w-5" />
               <span className="font-bold text-sm text-left">Review Trips</span>
            </button>
            <button 
              onClick={() => setActiveTab('PAYMENTS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'PAYMENTS' ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}
            >
               <CreditCard className="h-5 w-5" />
               <span className="font-bold text-sm text-left">Confirm Payments</span>
            </button>
         </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 space-y-10">
         <header className="flex justify-between items-center">
            <div>
               <h1 className="text-3xl font-black text-deep-blue">Verification Queue</h1>
               <p className="text-gray-500 font-medium">Manage pending requests and applications.</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-white rounded-xl border-none shadow-sm text-sm focus:ring-2 focus:ring-sunset-orange/20" />
               </div>
               <div className="h-10 w-10 bg-gray-200 rounded-full border-2 border-white shadow-sm overflow-hidden">
                  <img src="https://ui-avatars.com/api/?name=Admin&background=1E3A8A&color=fff" alt="" />
               </div>
            </div>
         </header>

         {/* Content Area */}
         <div className="space-y-6">
            {activeTab === 'AGENCIES' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                 <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-sunset-orange" />
                    Pending Agency Applications ({pendingAgencies?.length || 0})
                 </h2>
                 <div className="grid grid-cols-1 gap-4">
                    {pendingAgencies?.map((agency: any) => (
                       <Card key={agency.id} className="border-none shadow-sm hover:shadow-md transition-shadow rounded-2xl p-6 bg-white overflow-hidden">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-6">
                                <div className="h-16 w-16 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden">
                                   <img src={agency.logo || `https://ui-avatars.com/api/?name=${agency.companyName}&background=F3F4F6&color=1E3A8A`} alt="" />
                                </div>
                                <div>
                                   <h3 className="text-lg font-bold text-deep-blue">{agency.companyName}</h3>
                                   <p className="text-sm text-gray-500">ICE: {agency.ice} • Joined {new Date(agency.user.createdAt).toLocaleDateString()}</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <Button className="bg-red-50 text-red-600 hover:bg-red-100 border-none px-6 font-bold" onClick={() => verifyAgencyMutation.mutate({ id: agency.id, status: 'REJECTED' })}>
                                   Reject
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700 text-white border-none px-6 font-bold" onClick={() => verifyAgencyMutation.mutate({ id: agency.id, status: 'VERIFIED' })}>
                                   Approve
                                </Button>
                             </div>
                          </div>
                       </Card>
                    ))}
                    {pendingAgencies?.length === 0 && <div className="text-center py-20 bg-white rounded-3xl text-gray-400 font-bold uppercase tracking-widest border-2 border-dashed border-gray-100 italic">No pending agencies</div>}
                 </div>
              </div>
            )}

            {activeTab === 'TRIPS' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                 <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-sunset-orange" />
                    Trip Quality Review ({pendingTrips?.length || 0})
                 </h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pendingTrips?.map((trip: any) => (
                       <Card key={trip.id} className="border-none shadow-sm hover:shadow-md transition-shadow rounded-3xl overflow-hidden bg-white">
                          <div className="h-48 relative">
                             <img src={trip.images?.[0]} className="w-full h-full object-cover" alt="" />
                             <div className="absolute top-4 left-4">
                                <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-deep-blue text-xs font-bold rounded-lg uppercase">{trip.category}</span>
                             </div>
                          </div>
                          <CardContent className="p-6 space-y-4">
                             <div>
                                <h3 className="text-lg font-bold text-deep-blue line-clamp-1">{trip.title}</h3>
                                <p className="text-sm text-gray-500">by <span className="font-bold text-sunset-orange">{trip.agency.companyName}</span></p>
                             </div>
                             <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                                <Button variant="outline" className="font-bold rounded-xl"><Eye className="h-4 w-4 mr-2" /> Preview</Button>
                                <div className="flex gap-2">
                                   <Button className="h-10 w-10 p-0 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl border-none" onClick={() => verifyTripMutation.mutate({ id: trip.id, status: 'ARCHIVED' })}>
                                      <XCircle className="h-5 w-5" />
                                   </Button>
                                   <Button className="h-10 w-10 p-0 bg-green-600 text-white hover:bg-green-700 rounded-xl border-none" onClick={() => verifyTripMutation.mutate({ id: trip.id, status: 'ACTIVE' })}>
                                      <CheckCircle2 className="h-5 w-5" />
                                   </Button>
                                </div>
                             </div>
                          </CardContent>
                       </Card>
                    ))}
                    {pendingTrips?.length === 0 && <div className="col-span-full text-center py-20 bg-white rounded-3xl text-gray-400 font-bold">No trips to review</div>}
                 </div>
              </div>
            )}

            {activeTab === 'PAYMENTS' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                 <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-sunset-orange" />
                    Payment Confirmation ({pendingPayments?.length || 0})
                 </h2>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {pendingPayments?.map((pay: any) => (
                       <Card key={pay.id} className="border-none shadow-sm rounded-3xl p-6 bg-white overflow-hidden">
                          <div className="flex gap-6">
                             <div className="w-32 h-44 bg-gray-100 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center cursor-zoom-in group relative">
                                <img src={pay.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                   <Eye className="text-white h-8 w-8" />
                                </div>
                             </div>
                             <div className="flex-1 space-y-4">
                                <div>
                                   <h3 className="font-bold text-deep-blue leading-tight">{pay.booking.session.template.title}</h3>
                                   <p className="text-xs text-sunset-orange font-bold uppercase tracking-wider mt-1">{pay.booking.traveler.name}</p>
                                </div>
                                <div className="space-y-1">
                                   <p className="text-2xl font-black text-deep-blue">{pay.booking.totalAmount} MAD</p>
                                   <p className="text-xs text-gray-400 font-bold">Requested: {new Date(pay.uploadedAt).toLocaleString()}</p>
                                </div>
                                <div className="flex gap-2 pt-2">
                                   <Button className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 border-none font-bold" onClick={() => verifyPaymentMutation.mutate({ id: pay.id, status: 'REJECTED' })}>
                                      Reject
                                   </Button>
                                   <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white border-none font-bold" onClick={() => verifyPaymentMutation.mutate({ id: pay.id, status: 'VERIFIED' })}>
                                      Confirm
                                   </Button>
                                </div>
                             </div>
                          </div>
                       </Card>
                    ))}
                 </div>
              </div>
            )}
         </div>
      </main>
    </div>
  );
}
