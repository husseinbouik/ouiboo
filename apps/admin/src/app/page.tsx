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
import { VerificationStatus, type VerificationStatusType } from '@ouiboo/types';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'AGENCIES' | 'BOOKINGS' | 'PAYMENT_PROOFS' | 'PAYOUTS'>('PENDING');
  const [selectedAgency, setSelectedAgency] = useState<any | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [agencyFeedback, setAgencyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [paymentProofFeedback, setPaymentProofFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [payoutFeedback, setPayoutFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
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

  const { data: pendingPaymentProofs, isLoading: loadingPayments } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: async () => {
      const resp = await apiClient.get('/admin/pending-payments');
      return resp.data;
    }
  });

  const { data: payoutRequests, isLoading: loadingPayoutRequests } = useQuery({
    queryKey: ['payout-requests'],
    queryFn: async () => {
      const resp = await apiClient.get('/admin/payout-requests');
      return resp.data;
    }
  });

  const verifyAgencyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: VerificationStatusType }) => {
      return apiClient.post(`/admin/agencies/${id}/verify`, { status });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-agencies'] });
      queryClient.invalidateQueries({ queryKey: ['all-agencies'] });
      setAgencyFeedback({
        type: 'success',
        message: `Agency ${variables.status === VerificationStatus.Verified ? 'approved' : 'rejected'} successfully.`
      });
    },
    onError: (error: any) => {
      setAgencyFeedback({
        type: 'error',
        message: error?.response?.data?.message || 'Unable to update agency status. Please try again.'
      });
    }
  });

  const verifyTripMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: VerificationStatusType }) => {
      return apiClient.post(`/admin/trips/${id}/verify`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-trips'] })
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: VerificationStatusType }) => {
      return apiClient.post(`/admin/payments/${id}/verify`, { status });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      setPaymentProofFeedback({
        type: 'success',
        message: `Payment proof ${variables.status === VerificationStatus.Verified ? 'approved' : 'rejected'} successfully.`
      });
    },
    onError: (error: any) => {
      setPaymentProofFeedback({
        type: 'error',
        message: error?.response?.data?.message || 'Unable to update payment proof. Please try again.'
      });
    }
  });

  const processPayoutMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      return apiClient.post(`/admin/payouts/${id}/process`, { status });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payout-requests'] });
      setPayoutFeedback({
        type: 'success',
        message: `Payout ${variables.status === 'PAID' ? 'marked as paid' : 'rejected'} successfully.`
      });
    },
    onError: (error: any) => {
      setPayoutFeedback({
        type: 'error',
        message: error?.response?.data?.message || 'Unable to update payout request. Please try again.'
      });
    }
  });

  const updateAgencyStatusMutation = useMutation({
    mutationFn: async ({ id, verificationStatus, subscriptionStatus }: { id: string, verificationStatus?: VerificationStatusType, subscriptionStatus?: string }) => {
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
      label: 'Payment proofs',
      value: pendingPaymentProofs?.length || 0,
      icon: CalendarClock,
      tone: 'bg-slate-100 text-slate-700'
    }
  ];

  const tabMeta = {
    PENDING: {
      title: 'Verification Queue',
      description: 'Review agencies and trips waiting for approval.',
      searchPlaceholder: 'Search agencies, trips, or IDs...'
    },
    AGENCIES: {
      title: 'Agency Directory',
      description: 'Manage verification status and subscriptions.',
      searchPlaceholder: 'Search agencies by name or email...'
    },
    BOOKINGS: {
      title: 'System Bookings',
      description: 'Track bookings and traveler activity across the platform.',
      searchPlaceholder: 'Search bookings or travelers...'
    },
    PAYMENT_PROOFS: {
      title: 'Payment Proofs',
      description: 'Approve or reject uploaded payment receipts.',
      searchPlaceholder: 'Search payment proofs by traveler or booking...'
    },
    PAYOUTS: {
      title: 'Payout Requests',
      description: 'Review agency payout requests before releasing funds.',
      searchPlaceholder: 'Search payout requests by agency...'
    }
  } as const;

  const navItems = [
    {
      key: 'PENDING',
      label: 'Verification Queue',
      icon: ShieldCheck,
      count: (pendingAgencies?.length || 0) + (pendingTrips?.length || 0),
    },
    {
      key: 'AGENCIES',
      label: 'Manage Agencies',
      icon: Users,
      count: allAgencies?.length || 0,
    },
    {
      key: 'BOOKINGS',
      label: 'System Bookings',
      icon: LayoutDashboard,
      count: allBookings?.length || 0,
    },
    {
      key: 'PAYMENT_PROOFS',
      label: 'Payment Proofs',
      icon: CreditCard,
      count: pendingPaymentProofs?.length || 0,
    },
    {
      key: 'PAYOUTS',
      label: 'Payout Requests',
      icon: CalendarClock,
      count: payoutRequests?.length || 0,
    },
  ] as const;

  const currentTab = tabMeta[activeTab];

  const renderBankDetails = (bankDetails?: string) => {
    if (!bankDetails) {
      return <p className="text-gray-500">No bank details on file.</p>;
    }

    let details: any = bankDetails;
    try {
      details = JSON.parse(bankDetails);
    } catch (error) {
      details = bankDetails;
    }

    if (typeof details === 'string') {
      return <p className="text-sm text-gray-600 whitespace-pre-line">{details}</p>;
    }

    return (
      <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm">
        {Object.entries(details || {}).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-4">
            <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
            <span className="font-medium text-deep-blue">{String(value ?? 'N/A')}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-deep-blue text-white p-6 space-y-8">
         <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 bg-sunset-orange rounded-lg"></div>
            <span className="text-xl font-black tracking-tight">OUIBOO ADMIN</span>
         </div>
         
         <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-bold text-sm text-left">{item.label}</span>
                  <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-white/10 text-white/70"}`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
         </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 space-y-10">
         <header className="flex justify-between items-center">
            <div>
               <h1 className="text-3xl font-black text-deep-blue">{currentTab.title}</h1>
               <p className="text-gray-500 font-medium">{currentTab.description}</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" placeholder={currentTab.searchPlaceholder} className="pl-10 pr-4 py-2 bg-white rounded-xl border-none shadow-sm text-sm focus:ring-2 focus:ring-sunset-orange/20" />
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
                                      <p className="text-sm text-gray-500">ICE: {agency.ice} - Joined {new Date(agency.user.createdAt).toLocaleDateString()}</p>
                                   </div>
                                </div>
                                <div className="flex items-center gap-3">
                                   <Button
                                     variant="outline"
                                     className="border-gray-200"
                                     onClick={() => {
                                       setSelectedAgency(agency);
                                       setAgencyFeedback(null);
                                     }}
                                   >
                                     <Eye className="h-4 w-4 mr-2" />
                                     Review
                                   </Button>
                                   <Button className="bg-red-50 text-red-600 hover:bg-red-100 border-none px-6 font-bold" onClick={() => verifyAgencyMutation.mutate({ id: agency.id, status: VerificationStatus.Rejected })}>Reject</Button>
                                   <Button className="bg-green-600 hover:bg-green-700 text-white border-none px-6 font-bold" onClick={() => verifyAgencyMutation.mutate({ id: agency.id, status: VerificationStatus.Verified })}>Approve</Button>
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
                                     <Badge className={agency.verificationStatus === VerificationStatus.Verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{agency.verificationStatus}</Badge>
                                     <Badge variant="outline">{agency.subscriptionStatus || 'TRIAL'}</Badge>
                                  </div>
                               </div>
                            </div>
                            <div className="flex gap-2">
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => {
                                   setSelectedAgency(agency);
                                   setAgencyFeedback(null);
                                 }}
                               >
                                 <Eye className="h-4 w-4 mr-2" />
                                 View
                               </Button>
                               <Button variant="outline" size="sm" onClick={() => updateAgencyStatusMutation.mutate({ id: agency.id, verificationStatus: agency.verificationStatus === VerificationStatus.Verified ? VerificationStatus.Rejected : VerificationStatus.Verified })}>
                                  {agency.verificationStatus === VerificationStatus.Verified ? 'Deactivate' : 'Activate'}
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

            {activeTab === 'PAYMENT_PROOFS' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                  <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-sunset-orange" />
                    Pending Payment Proofs ({pendingPaymentProofs?.length || 0})
                 </h2>
                 {paymentProofFeedback && (
                   <div className={`text-sm font-medium ${paymentProofFeedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                     {paymentProofFeedback.message}
                   </div>
                 )}
                 <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                    {pendingPaymentProofs?.length ? (
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b">
                           <tr>
                              <th className="px-6 py-4">Booking</th>
                              <th className="px-6 py-4">Traveler</th>
                              <th className="px-6 py-4">Amount</th>
                              <th className="px-6 py-4">Submitted</th>
                              <th className="px-6 py-4 text-right">Action</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                           {pendingPaymentProofs?.map((payment: any) => (
                              <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                                 <td className="px-6 py-4">
                                    <p className="font-bold text-sm">{payment.booking?.session?.template?.title || 'Booking'}</p>
                                    <p className="text-[10px] text-gray-400 font-mono italic">#{payment.booking?.id?.substring(0, 8)}</p>
                                 </td>
                                 <td className="px-6 py-4 text-sm font-medium">
                                    {payment.booking?.traveler?.name || 'Traveler'}
                                 </td>
                                 <td className="px-6 py-4 text-sm font-semibold">{payment.booking?.totalAmount ?? payment.amount} MAD</td>
                                 <td className="px-6 py-4 text-sm text-gray-500">
                                    {payment.uploadedAt ? new Date(payment.uploadedAt).toLocaleDateString() : 'N/A'}
                                 </td>
                                 <td className="px-6 py-4 text-right space-x-2">
                                    <Button
                                      size="sm"
                                      className="bg-red-50 text-red-600 hover:bg-red-100 border-none"
                                      onClick={() => verifyPaymentMutation.mutate({ id: payment.id, status: VerificationStatus.Rejected })}
                                    >
                                      Reject
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white border-none"
                                      onClick={() => verifyPaymentMutation.mutate({ id: payment.id, status: VerificationStatus.Verified })}
                                    >
                                      Approve
                                    </Button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-10 text-center text-sm text-gray-500">
                        No payment proofs are waiting for review.
                      </div>
                    )}
                 </div>
              </div>
            )}

            {activeTab === 'PAYOUTS' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                 <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-sunset-orange" />
                    Payout Requests ({payoutRequests?.length || 0})
                 </h2>
                 <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
                    <div className="space-y-4">
                       {payoutRequests?.length ? (
                         payoutRequests?.map((payout: any) => (
                          <Card key={payout.id} className="border-none shadow-sm p-5 bg-white">
                             <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                   <p className="text-sm text-gray-500">Request #{payout.id?.slice(0, 8)}</p>
                                   <h3 className="font-bold text-deep-blue">{payout.agency?.companyName || 'Agency payout'}</h3>
                                   <p className="text-xs text-gray-400">
                                     {payout.requestedAt ? new Date(payout.requestedAt).toLocaleDateString() : 'N/A'} - {payout.amount} MAD
                                   </p>
                                </div>
                                <div className="flex items-center gap-2">
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={() => {
                                       setSelectedPayout(payout);
                                       setPayoutFeedback(null);
                                     }}
                                   >
                                     <Eye className="h-4 w-4 mr-2" />
                                     Details
                                   </Button>
                                   <Button
                                     size="sm"
                                     className="bg-red-50 text-red-600 hover:bg-red-100 border-none"
                                     onClick={() => processPayoutMutation.mutate({ id: payout.id, status: 'REJECTED' })}
                                   >
                                     Reject
                                   </Button>
                                   <Button
                                     size="sm"
                                     className="bg-green-600 hover:bg-green-700 text-white border-none"
                                     onClick={() => processPayoutMutation.mutate({ id: payout.id, status: 'PAID' })}
                                   >
                                     Approve
                                   </Button>
                                </div>
                             </div>
                          </Card>
                       ))
                       ) : (
                         <Card className="border-none shadow-sm p-6 bg-white text-sm text-gray-500">
                           No payout requests are waiting for review.
                         </Card>
                       )}
                    </div>
                    <Card className="border-none shadow-sm p-6 bg-white h-fit">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-deep-blue">Payout Details</h3>
                        {selectedPayout && (
                          <Badge className="bg-sunset-orange/10 text-sunset-orange">Selected</Badge>
                        )}
                      </div>
                      {!selectedPayout && (
                        <p className="text-sm text-gray-500 mt-4">Select a payout request to review agency bank details and approve or reject.</p>
                      )}
                      {selectedPayout && (
                        <div className="mt-4 space-y-5">
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Agency</p>
                            <p className="text-base font-bold text-deep-blue">{selectedPayout.agency?.companyName || 'Agency payout'}</p>
                            <p className="text-sm text-gray-500">{selectedPayout.agency?.user?.email}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Requested</p>
                              <p className="font-medium text-deep-blue">{selectedPayout.requestedAt ? new Date(selectedPayout.requestedAt).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</p>
                              <p className="font-medium text-deep-blue">{selectedPayout.amount} MAD</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Agency Bank Details</p>
                            <div className="space-y-2 text-sm">
                              {renderBankDetails(selectedPayout.bankDetails)}
                            </div>
                          </div>
                          {payoutFeedback && (
                            <div className={`text-sm font-medium ${payoutFeedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                              {payoutFeedback.message}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              className="bg-green-600 hover:bg-green-700 text-white border-none"
                              onClick={() => processPayoutMutation.mutate({ id: selectedPayout.id, status: 'PAID' })}
                            >
                              Approve payout
                            </Button>
                            <Button
                              className="bg-red-50 text-red-600 hover:bg-red-100 border-none"
                              onClick={() => processPayoutMutation.mutate({ id: selectedPayout.id, status: 'REJECTED' })}
                            >
                              Reject payout
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                 </div>
              </div>
            )}
         </div>
      </main>

      {selectedAgency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <Card className="max-w-2xl w-full border-none shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-deep-blue">Agency Review</CardTitle>
                <p className="text-sm text-gray-500">Review verification details and approve or reject.</p>
              </div>
              <Button variant="ghost" onClick={() => setSelectedAgency(null)}>
                <XCircle className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-gray-100 rounded-2xl overflow-hidden">
                  <img src={selectedAgency.logo || `https://ui-avatars.com/api/?name=${selectedAgency.companyName}`} alt="" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-deep-blue">{selectedAgency.companyName}</h3>
                  <p className="text-sm text-gray-500">ICE: {selectedAgency.ice || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</p>
                  <p className="font-medium text-deep-blue">{selectedAgency.user?.name || 'Not provided'}</p>
                  <p className="text-gray-500">{selectedAgency.user?.email || 'No email on file'}</p>
                  <p className="text-gray-500">{selectedAgency.user?.phone || 'No phone on file'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</p>
                  <div className="flex gap-2">
                    <Badge className={selectedAgency.verificationStatus === VerificationStatus.Verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {selectedAgency.verificationStatus || VerificationStatus.Pending}
                    </Badge>
                    <Badge variant="outline">{selectedAgency.subscriptionStatus || 'TRIAL'}</Badge>
                  </div>
                  <p className="text-gray-500 text-xs">Joined {selectedAgency.user?.createdAt ? new Date(selectedAgency.user.createdAt).toLocaleDateString() : 'Unknown'}</p>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Agency Address</p>
                  <p className="text-gray-500">{selectedAgency.address || selectedAgency.profile?.address || 'No address provided.'}</p>
                </div>
              </div>
              {agencyFeedback && (
                <div className={`text-sm font-medium ${agencyFeedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {agencyFeedback.message}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white border-none"
                  onClick={() => verifyAgencyMutation.mutate({ id: selectedAgency.id, status: VerificationStatus.Verified })}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve agency
                </Button>
                <Button
                  className="bg-red-50 text-red-600 hover:bg-red-100 border-none"
                  onClick={() => verifyAgencyMutation.mutate({ id: selectedAgency.id, status: VerificationStatus.Rejected })}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject agency
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
