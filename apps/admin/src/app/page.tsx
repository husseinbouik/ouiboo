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
  Search,
  TrendingUp,
  CalendarClock
} from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@ouiboo/ui';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'AGENCIES' | 'BOOKINGS' | 'PAYMENTS'>('PENDING');
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

  const { data: allAgencies, isLoading: loadingAllAgencies } = useQuery({
    queryKey: ['all-agencies'],
    queryFn: async () => {
      const resp = await apiClient.get('/admin/agencies');
      return resp.data;
    }
  });

  const { data: allBookings, isLoading: loadingAllBookings } = useQuery({
    queryKey: ['all-bookings'],
    queryFn: async () => {
      const resp = await apiClient.get('/admin/bookings');
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

  const updateAgencyStatusMutation = useMutation({
    mutationFn: async ({ id, verificationStatus, subscriptionStatus }: { id: string, verificationStatus?: string, subscriptionStatus?: string }) => {
      return apiClient.patch(`/admin/agencies/${id}/status`, { verificationStatus, subscriptionStatus });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-agencies'] })
  });

  const summaryCards = [
    {
      label: 'Pending agencies',
      value: pendingAgencies?.length || 0,
      icon: ShieldCheck,
      tone: 'bg-sunset-orange/10 text-sunset-orange'
    },
    {
      label: 'Trips in review',
      value: pendingTrips?.length || 0,
      icon: MapPin,
      tone: 'bg-blue-50 text-blue-700'
    },
    {
      label: 'Bookings today',
      value: allBookings?.length || 0,
      icon: TrendingUp,
      tone: 'bg-emerald-50 text-emerald-700'
    },
    {
      label: 'Payout requests',
      value: pendingPayments?.length || 0,
      icon: CalendarClock,
      tone: 'bg-slate-100 text-slate-700'
    }
  ];

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
              onClick={() => setActiveTab('PENDING')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'PENDING' ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}
            >
               <ShieldCheck className="h-5 w-5" />
               <span className="font-bold text-sm text-left">Verification Queue</span>
            </button>
            <button 
              onClick={() => setActiveTab('AGENCIES')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'AGENCIES' ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}
            >
               <Users className="h-5 w-5" />
               <span className="font-bold text-sm text-left">Manage Agencies</span>
            </button>
            <button 
              onClick={() => setActiveTab('BOOKINGS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'BOOKINGS' ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}
            >
               <LayoutDashboard className="h-5 w-5" />
               <span className="font-bold text-sm text-left">System Bookings</span>
            </button>
            <button 
              onClick={() => setActiveTab('PAYMENTS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'PAYMENTS' ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}
            >
               <CreditCard className="h-5 w-5" />
               <span className="font-bold text-sm text-left">Payout Requests</span>
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

         <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Card key={card.label} className="border-none shadow-sm rounded-2xl">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{card.label}</p>
                    <p className="text-3xl font-black text-deep-blue mt-2">{card.value}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${card.tone}`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            ))}
         </section>

         {/* Content Area */}
         <div className="space-y-6">
            {activeTab === 'PENDING' && (
              <div className="space-y-12">
                 <section className="space-y-6">
                    <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                       <ShieldCheck className="h-5 w-5 text-sunset-orange" />
                       Pending Agency Applications ({pendingAgencies?.length || 0})
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                       {pendingAgencies?.map((agency: any) => (
                          <Card key={agency.id} className="border-none shadow-sm rounded-2xl p-6 bg-white overflow-hidden">
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
                                   <Button className="bg-red-50 text-red-600 hover:bg-red-100 border-none px-6 font-bold" onClick={() => verifyAgencyMutation.mutate({ id: agency.id, status: 'REJECTED' })}>Reject</Button>
                                   <Button className="bg-green-600 hover:bg-green-700 text-white border-none px-6 font-bold" onClick={() => verifyAgencyMutation.mutate({ id: agency.id, status: 'VERIFIED' })}>Approve</Button>
                                </div>
                             </div>
                          </Card>
                       ))}
                    </div>
                 </section>

                 <section className="space-y-6">
                    <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                       <MapPin className="h-5 w-5 text-sunset-orange" />
                       Trip Quality Review ({pendingTrips?.length || 0})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {pendingTrips?.map((trip: any) => (
                          <Card key={trip.id} className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                             <div className="h-32 relative">
                                <img src={trip.images?.[0]} className="w-full h-full object-cover" alt="" />
                             </div>
                             <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                   <h3 className="font-bold text-deep-blue line-clamp-1">{trip.title}</h3>
                                   <p className="text-xs text-gray-500">{trip.agency.companyName}</p>
                                </div>
                                <Button size="sm" className="bg-green-600" onClick={() => verifyTripMutation.mutate({ id: trip.id, status: 'ACTIVE' })}>Approve</Button>
                             </CardContent>
                          </Card>
                       ))}
                    </div>
                 </section>
              </div>
            )}

            {activeTab === 'AGENCIES' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                   <Users className="h-5 w-5 text-sunset-orange" />
                   All Agencies Management ({allAgencies?.length || 0})
                </h2>
                <div className="grid grid-cols-1 gap-4">
                   {allAgencies?.map((agency: any) => (
                      <Card key={agency.id} className="border-none shadow-sm p-6 bg-white overflow-hidden">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <div className="h-12 w-12 bg-gray-100 rounded-xl overflow-hidden">
                                  <img src={agency.logo || `https://ui-avatars.com/api/?name=${agency.companyName}`} alt="" />
                               </div>
                               <div>
                                  <h3 className="font-bold text-deep-blue">{agency.companyName}</h3>
                                  <div className="flex gap-2">
                                     <Badge className={agency.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{agency.verificationStatus}</Badge>
                                     <Badge variant="outline">{agency.subscriptionStatus || 'TRIAL'}</Badge>
                                  </div>
                               </div>
                            </div>
                            <div className="flex gap-2">
                               <Button variant="outline" size="sm" onClick={() => updateAgencyStatusMutation.mutate({ id: agency.id, verificationStatus: agency.verificationStatus === 'VERIFIED' ? 'REJECTED' : 'VERIFIED' })}>
                                  {agency.verificationStatus === 'VERIFIED' ? 'Deactivate' : 'Activate'}
                               </Button>
                            </div>
                         </div>
                      </Card>
                   ))}
                </div>
              </div>
            )}

            {activeTab === 'BOOKINGS' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                   <LayoutDashboard className="h-5 w-5 text-sunset-orange" />
                   System-wide Booking Monitor ({allBookings?.length || 0})
                </h2>
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                   <table className="w-full text-left">
                      <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b">
                         <tr>
                            <th className="px-6 py-4">Booking</th>
                            <th className="px-6 py-4">Traveler</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                         {allBookings?.map((booking: any) => (
                            <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                               <td className="px-6 py-4">
                                  <p className="font-bold text-sm line-clamp-1">{booking.session.template.title}</p>
                                  <p className="text-[10px] text-gray-400 font-mono italic">#{booking.id.substring(0, 8)}</p>
                               </td>
                               <td className="px-6 py-4 text-sm font-medium">{booking.traveler.name}</td>
                               <td className="px-6 py-4"><Badge className="font-black text-[8px] uppercase">{booking.status}</Badge></td>
                               <td className="px-6 py-4 text-right font-black">{booking.totalAmount} MAD</td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
              </div>
            )}

            {activeTab === 'PAYMENTS' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                  <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-sunset-orange" />
                    Pending Payout Confirmations ({pendingPayments?.length || 0})
                 </h2>
                 <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                    {pendingPayments?.length ? (
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b">
                           <tr>
                              <th className="px-6 py-4">Agency</th>
                              <th className="px-6 py-4">Amount</th>
                              <th className="px-6 py-4">Requested</th>
                              <th className="px-6 py-4 text-right">Action</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                           {pendingPayments?.map((payment: any) => (
                              <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                                 <td className="px-6 py-4">
                                    <p className="font-bold text-sm">{payment.agency?.companyName || 'Unknown agency'}</p>
                                    <p className="text-[10px] text-gray-400 font-mono italic">#{payment.id?.substring(0, 8)}</p>
                                 </td>
                                 <td className="px-6 py-4 text-sm font-semibold">{payment.amount} MAD</td>
                                 <td className="px-6 py-4 text-sm text-gray-500">
                                    {payment.requestedAt ? new Date(payment.requestedAt).toLocaleDateString() : '—'}
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <Button size="sm" className="bg-deep-blue text-white">Review</Button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-10 text-center text-sm text-gray-500">
                        No payout requests are waiting for review.
                      </div>
                    )}
                 </div>
              </div>
            )}
         </div>
      </main>
    </div>
  );
}
