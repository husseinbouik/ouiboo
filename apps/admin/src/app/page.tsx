'use client';

import React, { useState, useEffect } from 'react';
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
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'AGENCIES' | 'BOOKINGS' | 'PAYMENT_PROOFS' | 'PAYOUTS'>('PENDING');
  const [selectedAgency, setSelectedAgency] = useState<any | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [viewingProofId, setViewingProofId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [agencyFeedback, setAgencyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [paymentProofFeedback, setPaymentProofFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [payoutFeedback, setPayoutFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  const { data: pendingAgencies, isLoading: loadingAgencies } = useQuery({
    queryKey: ['pending-agencies', debouncedQuery],
    queryFn: async () => {
      const resp = await apiClient.get('/admin/pending-agencies', {
        params: debouncedQuery ? { q: debouncedQuery } : undefined,
      });
      return resp.data;
    }
  });

  const { data: pendingTrips, isLoading: loadingTrips } = useQuery({
    queryKey: ['pending-trips', debouncedQuery],
    queryFn: async () => {
      const resp = await apiClient.get('/admin/pending-trips', {
        params: debouncedQuery ? { q: debouncedQuery } : undefined,
      });
      return resp.data;
    }
  });

  const { data: allAgencies, isLoading: loadingAllAgencies } = useQuery({
    queryKey: ['all-agencies', debouncedQuery],
    queryFn: async () => {
      const resp = await apiClient.get('/admin/agencies', {
        params: debouncedQuery ? { q: debouncedQuery } : undefined,
      });
      return resp.data;
    }
  });

  const { data: allBookings, isLoading: loadingAllBookings } = useQuery({
    queryKey: ['all-bookings', debouncedQuery],
    queryFn: async () => {
      const resp = await apiClient.get('/admin/bookings', {
        params: debouncedQuery ? { q: debouncedQuery } : undefined,
      });
      return resp.data;
    }
  });

  const { data: pendingPaymentProofs, isLoading: loadingPayments } = useQuery({
    queryKey: ['pending-payments', debouncedQuery],
    queryFn: async () => {
      const resp = await apiClient.get('/admin/pending-payments', {
        params: debouncedQuery ? { q: debouncedQuery } : undefined,
      });
      return resp.data;
    }
  });

  const { data: payoutRequests, isLoading: loadingPayoutRequests } = useQuery({
    queryKey: ['payout-requests', debouncedQuery],
    queryFn: async () => {
      const resp = await apiClient.get('/admin/payout-requests', {
        params: debouncedQuery ? { q: debouncedQuery } : undefined,
      });
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
        message: variables.status === VerificationStatus.Verified
          ? t('dashboard.feedback.agencyApproved')
          : t('dashboard.feedback.agencyRejected')
      });
    },
    onError: (error: any) => {
      setAgencyFeedback({
        type: 'error',
        message: error?.response?.data?.message || t('dashboard.feedback.agencyUpdateError')
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
    mutationFn: async ({ id, status, rejectionReason }: { id: string, status: VerificationStatusType, rejectionReason?: string }) => {
      return apiClient.post(`/admin/payments/${id}/verify`, { status, rejectionReason });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      setPaymentProofFeedback({
        type: 'success',
        message: variables.status === VerificationStatus.Verified
          ? t('dashboard.feedback.paymentProofApproved')
          : t('dashboard.feedback.paymentProofRejected')
      });
    },
    onError: (error: any) => {
      setPaymentProofFeedback({
        type: 'error',
        message: error?.response?.data?.message || t('dashboard.feedback.paymentProofUpdateError')
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
        message: variables.status === 'PAID'
          ? t('dashboard.feedback.payoutPaid')
          : t('dashboard.feedback.payoutRejected')
      });
    },
    onError: (error: any) => {
      setPayoutFeedback({
        type: 'error',
        message: error?.response?.data?.message || t('dashboard.feedback.payoutUpdateError')
      });
    }
  });

  const updateAgencyStatusMutation = useMutation({
    mutationFn: async ({ id, verificationStatus, subscriptionStatus }: { id: string, verificationStatus?: VerificationStatusType, subscriptionStatus?: string }) => {
      return apiClient.patch(`/admin/agencies/${id}/status`, { verificationStatus, subscriptionStatus });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-agencies'] })
  });

  const handleViewPaymentProof = async (bookingId?: string) => {
    if (!bookingId || viewingProofId) {
      return;
    }
    setViewingProofId(bookingId);
    try {
      const response = await apiClient.get(`/bookings/${bookingId}/payment-proof/download`, {
        responseType: 'blob',
      });
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const fileUrl = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60_000);
    } catch (error: any) {
      setPaymentProofFeedback({
        type: 'error',
        message: error?.response?.data?.message || t('dashboard.feedback.paymentProofLoadError'),
      });
    } finally {
      setViewingProofId(null);
    }
  };

  const summaryCards = [
    {
      label: t('dashboard.summary.pendingAgencies'),
      value: pendingAgencies?.length || 0,
      icon: ShieldCheck,
      tone: 'bg-sunset-orange/10 text-sunset-orange'
    },
    {
      label: t('dashboard.summary.tripsInReview'),
      value: pendingTrips?.length || 0,
      icon: MapPin,
      tone: 'bg-blue-50 text-blue-700'
    },
    {
      label: t('dashboard.summary.bookingsToday'),
      value: allBookings?.length || 0,
      icon: TrendingUp,
      tone: 'bg-emerald-50 text-emerald-700'
    },
    {
      label: t('dashboard.summary.paymentProofs'),
      value: pendingPaymentProofs?.length || 0,
      icon: CalendarClock,
      tone: 'bg-slate-100 text-slate-700'
    }
  ];

  const tabMeta = {
    PENDING: {
      title: t('dashboard.meta.pending.title'),
      description: t('dashboard.meta.pending.description'),
      searchPlaceholder: t('dashboard.meta.pending.searchPlaceholder')
    },
    AGENCIES: {
      title: t('dashboard.meta.agencies.title'),
      description: t('dashboard.meta.agencies.description'),
      searchPlaceholder: t('dashboard.meta.agencies.searchPlaceholder')
    },
    BOOKINGS: {
      title: t('dashboard.meta.bookings.title'),
      description: t('dashboard.meta.bookings.description'),
      searchPlaceholder: t('dashboard.meta.bookings.searchPlaceholder')
    },
    PAYMENT_PROOFS: {
      title: t('dashboard.meta.paymentProofs.title'),
      description: t('dashboard.meta.paymentProofs.description'),
      searchPlaceholder: t('dashboard.meta.paymentProofs.searchPlaceholder')
    },
    PAYOUTS: {
      title: t('dashboard.meta.payouts.title'),
      description: t('dashboard.meta.payouts.description'),
      searchPlaceholder: t('dashboard.meta.payouts.searchPlaceholder')
    }
  } as const;

  const navItems = [
    {
      key: 'PENDING',
      label: t('dashboard.tabs.pending'),
      icon: ShieldCheck,
      count: (pendingAgencies?.length || 0) + (pendingTrips?.length || 0),
    },
    {
      key: 'AGENCIES',
      label: t('dashboard.tabs.agencies'),
      icon: Users,
      count: allAgencies?.length || 0,
    },
    {
      key: 'BOOKINGS',
      label: t('dashboard.tabs.bookings'),
      icon: LayoutDashboard,
      count: allBookings?.length || 0,
    },
    {
      key: 'PAYMENT_PROOFS',
      label: t('dashboard.tabs.paymentProofs'),
      icon: CreditCard,
      count: pendingPaymentProofs?.length || 0,
    },
    {
      key: 'PAYOUTS',
      label: t('dashboard.tabs.payouts'),
      icon: CalendarClock,
      count: payoutRequests?.length || 0,
    },
  ] as const;

  const currentTab = tabMeta[activeTab];

  const renderBankDetails = (bankDetails?: string) => {
    if (!bankDetails) {
      return <p className="text-gray-500">{t('dashboard.messages.noBankDetails')}</p>;
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
            <span className="font-medium text-deep-blue">{String(value ?? t('dashboard.labels.na'))}</span>
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
            <span className="text-xl font-black tracking-tight">{t('dashboard.brand')}</span>
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
            <div className="flex items-center gap-3">
               <LanguageSwitcher />
               <ThemeToggle />
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={currentTab.searchPlaceholder}
                    className="pl-10 pr-4 py-2 bg-white rounded-xl border-none shadow-sm text-sm focus:ring-2 focus:ring-sunset-orange/20"
                  />
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
                       {t('dashboard.sections.pendingAgencies')} ({pendingAgencies?.length || 0})
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
                                      <p className="text-sm text-gray-500">
                                        {t('dashboard.labels.ice')}: {agency.ice} - {t('dashboard.labels.joined')} {new Date(agency.user.createdAt).toLocaleDateString()}
                                      </p>
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
                                     {t('dashboard.actions.review')}
                                   </Button>
                                   <Button className="bg-red-50 text-red-600 hover:bg-red-100 border-none px-6 font-bold" onClick={() => verifyAgencyMutation.mutate({ id: agency.id, status: VerificationStatus.Rejected })}>{t('dashboard.actions.reject')}</Button>
                                   <Button className="bg-green-600 hover:bg-green-700 text-white border-none px-6 font-bold" onClick={() => verifyAgencyMutation.mutate({ id: agency.id, status: VerificationStatus.Verified })}>{t('dashboard.actions.approve')}</Button>
                                </div>
                             </div>
                          </Card>
                       ))}
                    </div>
                 </section>

                 <section className="space-y-6">
                    <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                       <MapPin className="h-5 w-5 text-sunset-orange" />
                       {t('dashboard.sections.tripQualityReview')} ({pendingTrips?.length || 0})
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
                                <Button size="sm" className="bg-green-600" onClick={() => verifyTripMutation.mutate({ id: trip.id, status: 'ACTIVE' })}>{t('dashboard.actions.approve')}</Button>
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
                   {t('dashboard.sections.allAgencies')} ({allAgencies?.length || 0})
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
                                 {t('dashboard.actions.view')}
                               </Button>
                               <Button variant="outline" size="sm" onClick={() => updateAgencyStatusMutation.mutate({ id: agency.id, verificationStatus: agency.verificationStatus === VerificationStatus.Verified ? VerificationStatus.Rejected : VerificationStatus.Verified })}>
                                  {agency.verificationStatus === VerificationStatus.Verified ? t('dashboard.actions.deactivate') : t('dashboard.actions.activate')}
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
                   {t('dashboard.sections.bookingMonitor')} ({allBookings?.length || 0})
                </h2>
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                   <table className="w-full text-left">
                      <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b">
                         <tr>
                            <th className="px-6 py-4">{t('dashboard.table.booking')}</th>
                            <th className="px-6 py-4">{t('dashboard.table.traveler')}</th>
                            <th className="px-6 py-4">{t('dashboard.table.status')}</th>
                            <th className="px-6 py-4 text-right">{t('dashboard.table.amount')}</th>
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
                    {t('dashboard.sections.pendingPaymentProofs')} ({pendingPaymentProofs?.length || 0})
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
                              <th className="px-6 py-4">{t('dashboard.table.booking')}</th>
                              <th className="px-6 py-4">{t('dashboard.table.traveler')}</th>
                              <th className="px-6 py-4">{t('dashboard.table.amount')}</th>
                              <th className="px-6 py-4">{t('dashboard.table.submitted')}</th>
                              <th className="px-6 py-4 text-right">{t('dashboard.table.action')}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                           {pendingPaymentProofs?.map((payment: any) => (
                              <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                                 <td className="px-6 py-4">
                                    <p className="font-bold text-sm">{payment.booking?.session?.template?.title || t('dashboard.labels.booking')}</p>
                                    <p className="text-[10px] text-gray-400 font-mono italic">#{payment.booking?.id?.substring(0, 8)}</p>
                                 </td>
                                 <td className="px-6 py-4 text-sm font-medium">
                                    {payment.booking?.traveler?.name || t('dashboard.labels.traveler')}
                                 </td>
                                 <td className="px-6 py-4 text-sm font-semibold">{payment.booking?.totalAmount ?? payment.amount} MAD</td>
                                 <td className="px-6 py-4 text-sm text-gray-500">
                                    {payment.uploadedAt ? new Date(payment.uploadedAt).toLocaleDateString() : t('dashboard.labels.na')}
                                 </td>
                                 <td className="px-6 py-4 text-right space-x-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-gray-200"
                                      onClick={() => handleViewPaymentProof(payment.booking?.id || payment.bookingId)}
                                      disabled={viewingProofId === (payment.booking?.id || payment.bookingId)}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      {viewingProofId === (payment.booking?.id || payment.bookingId) ? t('dashboard.messages.loading') : t('dashboard.actions.view')}
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-red-50 text-red-600 hover:bg-red-100 border-none"
                                      onClick={() => {
                                        const reason = window.prompt(t('dashboard.prompts.paymentProofRejection'));
                                        if (!reason) {
                                          setPaymentProofFeedback({
                                            type: 'error',
                                            message: t('dashboard.prompts.paymentProofReasonRequired'),
                                          });
                                          return;
                                        }
                                        verifyPaymentMutation.mutate({ id: payment.id, status: VerificationStatus.Rejected, rejectionReason: reason });
                                      }}
                                    >
                                      {t('dashboard.actions.reject')}
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white border-none"
                                      onClick={() => verifyPaymentMutation.mutate({ id: payment.id, status: VerificationStatus.Verified })}
                                    >
                                      {t('dashboard.actions.approve')}
                                    </Button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-10 text-center text-sm text-gray-500">
                        {t('dashboard.messages.noPaymentProofs')}
                      </div>
                    )}
                 </div>
              </div>
            )}

            {activeTab === 'PAYOUTS' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                 <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-sunset-orange" />
                    {t('dashboard.sections.payoutRequests')} ({payoutRequests?.length || 0})
                 </h2>
                 <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
                    <div className="space-y-4">
                       {payoutRequests?.length ? (
                         payoutRequests?.map((payout: any) => (
                          <Card key={payout.id} className="border-none shadow-sm p-5 bg-white">
                             <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                   <p className="text-sm text-gray-500">{t('dashboard.labels.requestId', { id: payout.id?.slice(0, 8) ?? '' })}</p>
                                   <h3 className="font-bold text-deep-blue">{payout.agency?.companyName || t('dashboard.labels.agencyPayout')}</h3>
                                   <p className="text-xs text-gray-400">
                                     {payout.requestedAt ? new Date(payout.requestedAt).toLocaleDateString() : t('dashboard.labels.na')} - {payout.amount} MAD
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
                                     {t('dashboard.actions.details')}
                                   </Button>
                                   <Button
                                     size="sm"
                                     className="bg-red-50 text-red-600 hover:bg-red-100 border-none"
                                     onClick={() => processPayoutMutation.mutate({ id: payout.id, status: 'REJECTED' })}
                                   >
                                     {t('dashboard.actions.reject')}
                                   </Button>
                                   <Button
                                     size="sm"
                                     className="bg-green-600 hover:bg-green-700 text-white border-none"
                                     onClick={() => processPayoutMutation.mutate({ id: payout.id, status: 'PAID' })}
                                   >
                                     {t('dashboard.actions.approve')}
                                   </Button>
                                </div>
                             </div>
                          </Card>
                       ))
                       ) : (
                         <Card className="border-none shadow-sm p-6 bg-white text-sm text-gray-500">
                           {t('dashboard.messages.noPayoutRequests')}
                         </Card>
                       )}
                    </div>
                    <Card className="border-none shadow-sm p-6 bg-white h-fit">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-deep-blue">{t('dashboard.labels.payoutDetails')}</h3>
                        {selectedPayout && (
                          <Badge className="bg-sunset-orange/10 text-sunset-orange">{t('dashboard.labels.selected')}</Badge>
                        )}
                      </div>
                      {!selectedPayout && (
                        <p className="text-sm text-gray-500 mt-4">{t('dashboard.messages.selectPayoutPrompt')}</p>
                      )}
                      {selectedPayout && (
                        <div className="mt-4 space-y-5">
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('dashboard.labels.agency')}</p>
                            <p className="text-base font-bold text-deep-blue">{selectedPayout.agency?.companyName || t('dashboard.labels.agencyPayout')}</p>
                            <p className="text-sm text-gray-500">{selectedPayout.agency?.user?.email}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('dashboard.labels.requested')}</p>
                              <p className="font-medium text-deep-blue">{selectedPayout.requestedAt ? new Date(selectedPayout.requestedAt).toLocaleDateString() : t('dashboard.labels.na')}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('dashboard.labels.amount')}</p>
                              <p className="font-medium text-deep-blue">{selectedPayout.amount} MAD</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('dashboard.labels.bankDetails')}</p>
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
                              {t('dashboard.actions.approvePayout')}
                            </Button>
                            <Button
                              className="bg-red-50 text-red-600 hover:bg-red-100 border-none"
                              onClick={() => processPayoutMutation.mutate({ id: selectedPayout.id, status: 'REJECTED' })}
                            >
                              {t('dashboard.actions.rejectPayout')}
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
                <CardTitle className="text-deep-blue">{t('dashboard.modal.agencyReview')}</CardTitle>
                <p className="text-sm text-gray-500">{t('dashboard.messages.reviewVerification')}</p>
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
                  <p className="text-sm text-gray-500">{t('dashboard.labels.ice')}: {selectedAgency.ice || t('dashboard.labels.na')}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('dashboard.labels.contact')}</p>
                  <p className="font-medium text-deep-blue">{selectedAgency.user?.name || t('dashboard.messages.notProvided')}</p>
                  <p className="text-gray-500">{selectedAgency.user?.email || t('dashboard.messages.noEmail')}</p>
                  <p className="text-gray-500">{selectedAgency.user?.phone || t('dashboard.messages.noPhone')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('dashboard.labels.status')}</p>
                  <div className="flex gap-2">
                    <Badge className={selectedAgency.verificationStatus === VerificationStatus.Verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {selectedAgency.verificationStatus || VerificationStatus.Pending}
                    </Badge>
                    <Badge variant="outline">{selectedAgency.subscriptionStatus || 'TRIAL'}</Badge>
                  </div>
                  <p className="text-gray-500 text-xs">
                    {t('dashboard.labels.joined')} {selectedAgency.user?.createdAt ? new Date(selectedAgency.user.createdAt).toLocaleDateString() : t('dashboard.messages.unknown')}
                  </p>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('dashboard.labels.agencyAddress')}</p>
                  <p className="text-gray-500">{selectedAgency.address || selectedAgency.profile?.address || t('dashboard.messages.noAddress')}</p>
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
                  {t('dashboard.actions.approveAgency')}
                </Button>
                <Button
                  className="bg-red-50 text-red-600 hover:bg-red-100 border-none"
                  onClick={() => verifyAgencyMutation.mutate({ id: selectedAgency.id, status: VerificationStatus.Rejected })}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t('dashboard.actions.rejectAgency')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
