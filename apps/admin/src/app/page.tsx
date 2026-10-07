'use client';

import type { AxiosError } from 'axios';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  CalendarClock,
  FileText,
  Download,
  Trash2,
  LogOut,
} from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, ConfirmDialog, ThemeToggle, LanguageSwitcher, Pagination, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@ouiboo/ui';
import { useAuth } from '@/components/AuthContext';
import { toPaginatedList, type PaginationMeta } from '@ouiboo/utils';
import {
  BookingPaymentStatus,
  type BookingDetails,
  PaymentMethod,
  PayoutStatus,
  type PayoutDetails,
  TripStatus,
  type TripStatusType,
  VerificationStatus,
  type VerificationStatusType,
} from '@ouiboo/types';
import { useTranslation } from 'react-i18next';
import { getAdminBookingBadgeLabel, getAdminPayoutBadgeMeta, getAdminVerificationBadgeClass, getAdminVerificationBadgeLabel, getAdminSubscriptionBadgeLabel, getAdminBookingPaymentBadgeLabel } from './status-mappers';

type AdminTab = 'PENDING' | 'AGENCIES' | 'BOOKINGS' | 'PAYMENT_PROOFS' | 'PAYOUTS' | 'AUDIT';

type ApiErrorResponse = {
  message?: string;
};

type AdminUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  createdAt?: string;
};

type AdminAgency = {
  id: string;
  companyName: string;
  ice?: string | null;
  logo?: string | null;
  verificationStatus?: VerificationStatusType;
  subscriptionStatus?: string | null;
  address?: string | null;
  profile?: {
    address?: string | null;
  } | null;
  user?: AdminUser | null;
};

type AdminTrip = {
  id: string;
  title: string;
  status?: TripStatusType;
  images?: string[];
  agency: {
    companyName: string;
  };
};

type AdminBooking = BookingDetails;

type AdminPaymentProof = {
  id: string;
  bookingId?: string;
  amount?: number;
  downloadUrl?: string;
  uploadedAt?: string | null;
  booking?: AdminBooking | null;
};

type AdminPayoutRequest = PayoutDetails;

type BankDetailsMap = Record<string, unknown>;

type AdminAuditLog = {
  id: string;
  createdAt: string;
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type AdminOverviewCounts = {
  pendingAgencies: number;
  pendingTrips: number;
  agencies: number;
  bookings: number;
  bookingsToday: number;
  pendingPaymentProofs: number;
  pendingPayouts: number;
  auditLogs: number;
};

type FeedbackState = {
  type: 'success' | 'error';
  message: string;
};

type PendingConfirmation =
  | { kind: 'prune-audits'; days: number }
  | { kind: 'refund-booking'; booking: AdminBooking };

const ADMIN_TABS: AdminTab[] = ['PENDING', 'AGENCIES', 'BOOKINGS', 'PAYMENT_PROOFS', 'PAYOUTS', 'AUDIT'];
const ADMIN_PAGE_LIMIT = 25;

const isAdminTab = (value: string | null): value is AdminTab => {
  return value !== null && ADMIN_TABS.includes(value as AdminTab);
};

const getErrorMessage = (
  error: AxiosError<ApiErrorResponse> | Error | null | undefined,
  fallback: string,
) => {
  if (error && 'response' in error) {
    return error.response?.data?.message || fallback;
  }

  return error?.message || fallback;
};

type AdminListResponse = {
  data: unknown;
  pagination: PaginationMeta | null;
};

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('PENDING');
  const [selectedAgency, setSelectedAgency] = useState<AdminAgency | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<AdminPayoutRequest | null>(null);
  const [viewingProofId, setViewingProofId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [agencyFeedback, setAgencyFeedback] = useState<FeedbackState | null>(null);
  const [paymentProofFeedback, setPaymentProofFeedback] = useState<FeedbackState | null>(null);
  const [payoutFeedback, setPayoutFeedback] = useState<FeedbackState | null>(null);
  const [bookingFeedback, setBookingFeedback] = useState<FeedbackState | null>(null);
  const [auditFeedback, setAuditFeedback] = useState<FeedbackState | null>(null);
  const [retentionDays, setRetentionDays] = useState('90');
  const [isExportingAuditLogs, setIsExportingAuditLogs] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const invalidateOverviewCounts = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-overview-counts'] });
  };

useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (isAdminTab(requestedTab) && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [activeTab, searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedQuery]);

  const handleTabChange = (nextTab: AdminTab) => {
    setActiveTab(nextTab);

    if (typeof window === 'undefined') {
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('tab', nextTab);
    window.history.replaceState({}, '', nextUrl);
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  const { data: overviewCounts } = useQuery<AdminOverviewCounts>({
    queryKey: ['admin-overview-counts'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/overview-counts');
      return response.data;
    },
    staleTime: 30_000,
  });

const useAdminListQuery = <T,>(path: string, queryKeyKey: string, enabled: boolean) => {
    const { data: raw } = useQuery<unknown>({
      queryKey: [queryKeyKey, activeTab, debouncedQuery, currentPage],
      queryFn: async () => {
        const resp = await apiClient.get(path, {
          params: {
            page: currentPage,
            limit: ADMIN_PAGE_LIMIT,
            ...(debouncedQuery ? { q: debouncedQuery } : {}),
          },
        });
        return resp.data as AdminListResponse;
      },
      enabled,
      placeholderData: (prev: unknown) => prev,
    });
    return toPaginatedList<T>(raw);
  };

  const pendingAgenciesList = useAdminListQuery<AdminAgency>('/admin/pending-agencies', 'pending-agencies', activeTab === 'PENDING');
  const pendingAgencies = pendingAgenciesList.data;
  const pendingAgenciesPagination = pendingAgenciesList.pagination;

  const pendingTripsList = useAdminListQuery<AdminTrip>('/admin/pending-trips', 'pending-trips', activeTab === 'PENDING');
  const pendingTrips = pendingTripsList.data;
  const pendingTripsPagination = pendingTripsList.pagination;

  const allAgenciesList = useAdminListQuery<AdminAgency>('/admin/agencies', 'all-agencies', activeTab === 'AGENCIES');
  const allAgencies = allAgenciesList.data;
  const allAgenciesPagination = allAgenciesList.pagination;

  const allBookingsList = useAdminListQuery<AdminBooking>('/admin/bookings', 'all-bookings', activeTab === 'BOOKINGS');
  const allBookings = allBookingsList.data;
  const allBookingsPagination = allBookingsList.pagination;

  const pendingPaymentProofsList = useAdminListQuery<AdminPaymentProof>('/admin/pending-payments', 'pending-payments', activeTab === 'PAYMENT_PROOFS');
  const pendingPaymentProofs = pendingPaymentProofsList.data;
  const pendingPaymentProofsPagination = pendingPaymentProofsList.pagination;

  const payoutRequestsList = useAdminListQuery<AdminPayoutRequest>('/admin/payout-requests', 'payout-requests', activeTab === 'PAYOUTS');
  const payoutRequests = payoutRequestsList.data;
  const payoutRequestsPagination = payoutRequestsList.pagination;

  const verifyAgencyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: VerificationStatusType }) => {
      return apiClient.post(`/admin/agencies/${id}/verify`, { status });
    },
    onSuccess: (_data, variables) => {
      invalidateOverviewCounts();
      queryClient.invalidateQueries({ queryKey: ['pending-agencies'] });
      queryClient.invalidateQueries({ queryKey: ['all-agencies'] });
      setAgencyFeedback({
        type: 'success',
        message: variables.status === VerificationStatus.Verified
          ? t('dashboard.feedback.agencyApproved')
          : t('dashboard.feedback.agencyRejected')
      });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      setAgencyFeedback({
        type: 'error',
        message: getErrorMessage(error, t('dashboard.feedback.agencyUpdateError'))
      });
    }
  });

  const updateAgencyStatusMutation = useMutation({
    mutationFn: async ({
      id,
      verificationStatus,
    }: {
      id: string;
      verificationStatus: VerificationStatusType;
    }) => {
      return apiClient.patch(`/admin/agencies/${id}/status`, {
        verificationStatus,
      });
    },
    onSuccess: () => {
      invalidateOverviewCounts();
      queryClient.invalidateQueries({ queryKey: ['pending-agencies'] });
      queryClient.invalidateQueries({ queryKey: ['all-agencies'] });
    },
  });
  const { data: auditLogsRaw } = useQuery<unknown>({
    queryKey: ['audit-logs', debouncedQuery, currentPage],
    queryFn: async () => {
      const resp = await apiClient.get('/admin/audit-logs', {
        params: {
          ...(debouncedQuery ? { q: debouncedQuery } : {}),
          page: currentPage,
          limit: 50,
        },
      });
      return resp.data;
    },
    enabled: activeTab === 'AUDIT',
    placeholderData: (prev: unknown) => prev,
  });
  const { data: auditLogs = [], pagination: auditLogsPagination } = toPaginatedList<AdminAuditLog>(auditLogsRaw);

  const verifyTripMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      return apiClient.post(`/admin/trips/${id}/verify`, { status });
    },
    onSuccess: () => {
      invalidateOverviewCounts();
      queryClient.invalidateQueries({ queryKey: ['pending-trips'] });
    }
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string, status: VerificationStatusType, rejectionReason?: string }) => {
      return apiClient.post(`/admin/payments/${id}/verify`, { status, rejectionReason });
    },
    onSuccess: (_data, variables) => {
      invalidateOverviewCounts();
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      setPaymentProofFeedback({
        type: 'success',
        message: variables.status === VerificationStatus.Verified
          ? t('dashboard.feedback.paymentProofApproved')
          : t('dashboard.feedback.paymentProofRejected')
      });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      setPaymentProofFeedback({
        type: 'error',
        message: getErrorMessage(error, t('dashboard.feedback.paymentProofUpdateError'))
      });
    }
  });

  const processPayoutMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      return apiClient.post(`/admin/payouts/${id}/process`, { status });
    },
    onSuccess: (_data, variables) => {
      invalidateOverviewCounts();
      queryClient.invalidateQueries({ queryKey: ['payout-requests'] });
      setPayoutFeedback({
        type: 'success',
        message: variables.status === PayoutStatus.Paid
          ? t('dashboard.feedback.payoutPaid')
          : t('dashboard.feedback.payoutRejected')
      });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      setPayoutFeedback({
        type: 'error',
        message: getErrorMessage(error, t('dashboard.feedback.payoutUpdateError'))
      });
    }
  });

  const refundBookingMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      return apiClient.post(`/admin/bookings/${id}/refund`, { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
      setBookingFeedback({
        type: 'success',
        message: t('dashboard.feedback.refundProcessed'),
      });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      setBookingFeedback({
        type: 'error',
        message: getErrorMessage(error, t('dashboard.feedback.refundError')),
      });
    },
  });

  const pruneAuditLogsMutation = useMutation({
    mutationFn: async ({ days }: { days: number }) => {
      return apiClient.post('/admin/audit-logs/retention', { days });
    },
    onSuccess: (response, variables) => {
      invalidateOverviewCounts();
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      setAuditFeedback({
        type: 'success',
        message: t('dashboard.audit.auditPruned', { count: response.data.deleted, days: variables.days }),
      });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      setAuditFeedback({
        type: 'error',
        message: getErrorMessage(error, t('dashboard.feedback.auditPruneError')),
      });
    },
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
      const contentTypeHeader = response.headers['content-type'];
      const contentType = typeof contentTypeHeader === 'string'
        ? contentTypeHeader
        : 'application/octet-stream';
      const fileUrl = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60_000);
    } catch (error) {
      setPaymentProofFeedback({
        type: 'error',
        message: getErrorMessage(error as AxiosError<ApiErrorResponse>, t('dashboard.feedback.paymentProofLoadError')),
      });
    } finally {
      setViewingProofId(null);
    }
  };

  const handleExportAuditLogs = async () => {
    if (isExportingAuditLogs) {
      return;
    }

    setIsExportingAuditLogs(true);
    try {
      const response = await apiClient.get('/admin/audit-logs/export', {
        params: debouncedQuery ? { q: debouncedQuery } : undefined,
        responseType: 'blob',
      });
      const fileUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60_000);
      setAuditFeedback({
        type: 'success',
        message: t('dashboard.feedback.auditExportSuccess'),
      });
    } catch (error) {
      setAuditFeedback({
        type: 'error',
        message: getErrorMessage(error as AxiosError<ApiErrorResponse>, t('dashboard.feedback.auditExportError')),
      });
    } finally {
      setIsExportingAuditLogs(false);
    }
  };

  const handlePruneAuditLogs = () => {
    const parsedDays = Number(retentionDays);
    if (!Number.isFinite(parsedDays) || parsedDays < 1) {
      setAuditFeedback({
        type: 'error',
        message: t('dashboard.feedback.retentionDaysInvalid'),
      });
      return;
    }

    setPendingConfirmation({ kind: 'prune-audits', days: parsedDays });
  };

  const handleConfirmAction = () => {
    if (!pendingConfirmation) return;

    if (pendingConfirmation.kind === 'prune-audits') {
      pruneAuditLogsMutation.mutate(
        { days: pendingConfirmation.days },
        { onSettled: () => setPendingConfirmation(null) },
      );
      return;
    }

    refundBookingMutation.mutate(
      {
        id: pendingConfirmation.booking.id,
        amount: Number(pendingConfirmation.booking.totalAmount),
      },
      { onSettled: () => setPendingConfirmation(null) },
    );
  };

  const summaryCards = [
    {
      label: t('dashboard.summary.pendingAgencies'),
      value: overviewCounts?.pendingAgencies ?? pendingAgencies.length,
      icon: ShieldCheck,
      tone: 'bg-sunset-orange/10 text-sunset-orange'
    },
    {
      label: t('dashboard.summary.tripsInReview'),
      value: overviewCounts?.pendingTrips ?? pendingTrips.length,
      icon: MapPin,
      tone: 'bg-secondary text-secondary-foreground'
    },
    {
      label: t('dashboard.summary.bookingsToday'),
      value: overviewCounts?.bookingsToday ?? 0,
      icon: TrendingUp,
      tone: 'bg-success/10 text-success'
    },
    {
      label: t('dashboard.summary.paymentProofs'),
      value: overviewCounts?.pendingPaymentProofs ?? pendingPaymentProofs.length,
      icon: CalendarClock,
      tone: 'bg-muted text-muted-foreground'
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
    },
    AUDIT: {
      title: t('dashboard.meta.audit.title'),
      description: t('dashboard.meta.audit.description'),
      searchPlaceholder: t('dashboard.meta.audit.searchPlaceholder')
    }
  } as const;

  const navItems = [
    {
      key: 'PENDING',
      label: t('dashboard.tabs.pending'),
      icon: ShieldCheck,
      count: overviewCounts
        ? overviewCounts.pendingAgencies + overviewCounts.pendingTrips
        : pendingAgencies.length + pendingTrips.length,
    },
    {
      key: 'AGENCIES',
      label: t('dashboard.tabs.agencies'),
      icon: Users,
      count: overviewCounts?.agencies ?? allAgencies.length,
    },
    {
      key: 'BOOKINGS',
      label: t('dashboard.tabs.bookings'),
      icon: LayoutDashboard,
      count: overviewCounts?.bookings ?? allBookings.length,
    },
    {
      key: 'PAYMENT_PROOFS',
      label: t('dashboard.tabs.paymentProofs'),
      icon: CreditCard,
      count: overviewCounts?.pendingPaymentProofs ?? pendingPaymentProofs.length,
    },
    {
      key: 'PAYOUTS',
      label: t('dashboard.tabs.payouts'),
      icon: CalendarClock,
      count: overviewCounts?.pendingPayouts ?? payoutRequests.length,
    },
    {
      key: 'AUDIT',
      label: t('dashboard.tabs.audit'),
      icon: FileText,
      count: overviewCounts?.auditLogs ?? auditLogs.length,
    },
  ] as const;

  const currentTab = tabMeta[activeTab];

  const paginationLabels = {
    showing: t('pagination.showing'),
    of: t('pagination.of'),
    pagination: t('pagination.nav'),
    previousPage: t('pagination.previousPage'),
    nextPage: t('pagination.nextPage'),
    goToPage: (page: number) => t('pagination.goToPage', { page }),
  };

  const renderBankDetails = (bankDetails?: string) => {
    if (!bankDetails) {
      return <p className="text-muted-foreground">{t('dashboard.messages.noBankDetails')}</p>;
    }

    let details: string | BankDetailsMap = bankDetails;
    try {
      details = JSON.parse(bankDetails) as BankDetailsMap;
    } catch {
      details = bankDetails;
    }

    if (typeof details === 'string') {
      return <p className="text-sm text-muted-foreground whitespace-pre-line">{details}</p>;
    }

    return (
      <div className="bg-muted rounded-xl p-3 space-y-1 text-sm">
        {Object.entries(details).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-4">
            <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
            <span className="font-medium text-foreground">{String(value ?? t('dashboard.labels.na'))}</span>
          </div>
        ))}
      </div>
    );
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) {
      return t('dashboard.labels.na');
    }

    return new Date(value).toLocaleString();
  };

  const renderAuditMetadata = (metadata?: Record<string, unknown> | null) => {
    if (!metadata || Object.keys(metadata).length === 0) {
      return <span className="text-muted-foreground">{t('dashboard.audit.noMetadata')}</span>;
    }

    return (
      <pre className="max-w-full overflow-x-auto whitespace-pre-wrap text-[11px] leading-5 text-muted-foreground">
        {JSON.stringify(metadata, null, 2)}
      </pre>
    );
  };

  const canApproveAgency = (status?: VerificationStatusType) => status !== VerificationStatus.Verified;
  const canRejectAgency = (status?: VerificationStatusType) => status !== VerificationStatus.Rejected;
  const canApproveTrip = (status?: TripStatusType) => status !== TripStatus.Active;
  const canRejectTrip = (status?: TripStatusType) => status !== TripStatus.Archived;
  const canApprovePaymentProof = (status?: VerificationStatusType) => status !== VerificationStatus.Verified;
  const canRejectPaymentProof = (status?: VerificationStatusType) => status !== VerificationStatus.Rejected;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - desktop only */}
      <aside className="hidden md:flex w-64 bg-deep-blue text-white p-6 space-y-8 flex-col">
         <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 bg-sunset-orange rounded-lg"></div>
            <span className="text-xl font-black tracking-tight">{t('dashboard.brand')}</span>
         </div>
         
         <nav aria-label={t('dashboard.aria.mainNavigation')} className="space-y-2 flex-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleTabChange(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-bold text-sm text-start">{item.label}</span>
                  <span className={`ms-auto text-[10px] font-black px-2 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-white/10 text-white/70"}`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
         </nav>
      </aside>

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 p-4 md:p-10 space-y-6 md:space-y-10">
         {/* Mobile nav - horizontal scrollable tabs */}
         <nav aria-label={t('dashboard.aria.mainNavigation')} className="md:hidden flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleTabChange(item.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap text-xs font-bold transition-all ${isActive ? "bg-deep-blue text-white shadow-sm" : "bg-card text-muted-foreground border border-border"}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
         </nav>

         <header className="flex flex-wrap justify-between items-center gap-4">
            <div>
               <h1 className="text-2xl md:text-3xl font-black text-foreground">{currentTab.title}</h1>
               <p className="text-muted-foreground font-medium text-sm md:text-base">{currentTab.description}</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="hidden sm:block relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={currentTab.searchPlaceholder}
                    className="ps-10 pe-4 py-2 bg-card rounded-xl border-none shadow-sm text-sm focus:ring-2 focus:ring-sunset-orange/20"
                  />
               </div>
               <LanguageSwitcher />
               <ThemeToggle />
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <button
                     aria-label={t('dashboard.signOut')}
                     className="h-10 w-10 bg-muted rounded-full border-2 border-border shadow-sm overflow-hidden hover:border-sunset-orange transition-colors focus:outline-none focus:ring-2 focus:ring-sunset-orange/40"
                   >
                     <Image src="https://ui-avatars.com/api/?name=Admin&background=0A192F&color=fff" alt={t('dashboard.aria.adminAvatar')} width={40} height={40} />
                   </button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                   <DropdownMenuItem
                     onSelect={async (event) => {
                       event.preventDefault();
                       try {
                         await logout();
                       } finally {
                         window.location.href = '/login';
                       }
                     }}
                     className="text-danger focus:text-danger cursor-pointer"
                   >
                     <LogOut className="h-4 w-4 me-2" />
                     {t('dashboard.signOut')}
                   </DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
            </div>
         </header>

         <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Card key={card.label} className="border-none shadow-sm rounded-2xl">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{card.label}</p>
                    <p className="text-3xl font-black text-foreground mt-2">{card.value}</p>
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
<h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-sunset-orange" />
                        {t('dashboard.sections.pendingAgencies')} ({pendingAgenciesPagination?.total ?? pendingAgencies.length})
                     </h2>
                    <div className="grid grid-cols-1 gap-4">
                       {pendingAgencies.map((agency) => (
                      (() => {
                        const canApprove = canApproveAgency(agency.verificationStatus);
                        const canReject = canRejectAgency(agency.verificationStatus);
                        return (
                      <Card key={agency.id} className="border-none shadow-sm rounded-2xl p-6 bg-card overflow-hidden">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                   <div className="h-16 w-16 bg-muted rounded-2xl flex items-center justify-center overflow-hidden">
                                      <Image src={agency.logo || `https://ui-avatars.com/api/?name=${agency.companyName}&background=F3F4F6&color=0A192F`} alt={t('dashboard.labels.agencyLogo', { name: agency.companyName })} width={64} height={64} className="h-full w-full object-cover" />
                                   </div>
                                   <div>
                                      <h3 className="text-lg font-bold text-foreground">{agency.companyName}</h3>
                                      <p className="text-sm text-muted-foreground">
                                        {t('dashboard.labels.ice')}: {agency.ice} - {t('dashboard.labels.joined')} {agency.user?.createdAt ? new Date(agency.user.createdAt).toLocaleDateString() : t('dashboard.labels.na')}
                                      </p>
                                   </div>
                                </div>
                                <div className="flex items-center gap-3">
                                   <Button
                                     variant="outline"
                                     className="border-border"
                                     onClick={() => {
                                       setSelectedAgency(agency);
                                       setAgencyFeedback(null);
                                     }}
                                   >
                                     <Eye className="h-4 w-4 ms-2" />
                                     {t('dashboard.actions.review')}
                                   </Button>
                                   <Button
                                     className="bg-danger/10 text-danger hover:bg-danger/15 border-none px-6 font-bold"
                                     onClick={() => verifyAgencyMutation.mutate({ id: agency.id, status: VerificationStatus.Rejected })}
                                     disabled={!canReject || verifyAgencyMutation.isPending}
                                   >
                                     {t('dashboard.actions.reject')}
                                   </Button>
                                   <Button
                                     className="bg-success text-success-foreground hover:bg-success/90 border-none px-6 font-bold"
                                     onClick={() => verifyAgencyMutation.mutate({ id: agency.id, status: VerificationStatus.Verified })}
                                     disabled={!canApprove || verifyAgencyMutation.isPending}
                                   >
                                     {t('dashboard.actions.approve')}
                                   </Button>
                                </div>
                             </div>
                          </Card>
);
                      })()
                       ))}
                    </div>
                    <Pagination pagination={pendingAgenciesPagination} onPageChange={setCurrentPage} labels={paginationLabels} className="mt-2" />
                 </section>

                 <section className="space-y-6">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-sunset-orange" />
                        {t('dashboard.sections.tripQualityReview')} ({pendingTripsPagination?.total ?? pendingTrips.length})
                     </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {pendingTrips.map((trip) => {
                         const canApprove = canApproveTrip(trip.status);
                         const canReject = canRejectTrip(trip.status);
                         return (
                            <Card key={trip.id} className="border-none shadow-sm rounded-3xl overflow-hidden bg-card">
                               <div className="h-32 relative">
                                  <Image src={trip.images?.[0] || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop'} className="w-full h-full object-cover" alt={trip.title} fill sizes="(min-width: 1024px) 25vw, 100vw" />
                               </div>
                               <CardContent className="p-4 flex items-center justify-between gap-3">
                                  <div>
                                     <h3 className="font-bold text-foreground line-clamp-1">{trip.title}</h3>
                                     <p className="text-xs text-muted-foreground">{trip.agency.companyName}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
                                      onClick={() => verifyTripMutation.mutate({ id: trip.id, status: TripStatus.Archived })}
                                      disabled={!canReject || verifyTripMutation.isPending}
                                    >
                                      {t('dashboard.actions.reject')}
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-success text-success-foreground hover:bg-success/90"
                                      onClick={() => verifyTripMutation.mutate({ id: trip.id, status: TripStatus.Active })}
                                      disabled={!canApprove || verifyTripMutation.isPending}
                                    >
                                      {t('dashboard.actions.approve')}
                                    </Button>
                                  </div>
                               </CardContent>
                            </Card>
                         );
                       })}
                    </div>
                    <Pagination pagination={pendingTripsPagination} onPageChange={setCurrentPage} labels={paginationLabels} className="mt-2" />
                 </section>
              </div>
            )}

            {activeTab === 'AGENCIES' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                   <Users className="h-5 w-5 text-sunset-orange" />
                   {t('dashboard.sections.allAgencies')} ({allAgenciesPagination?.total ?? allAgencies.length})
                </h2>
                <div className="grid grid-cols-1 gap-4">
                   {allAgencies.map((agency) => (
                      <Card key={agency.id} className="border-none shadow-sm p-6 bg-card overflow-hidden">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <div className="h-12 w-12 bg-muted rounded-xl overflow-hidden">
                                  <Image src={agency.logo || `https://ui-avatars.com/api/?name=${agency.companyName}`} alt={t('dashboard.labels.agencyLogo', { name: agency.companyName })} width={48} height={48} className="h-full w-full object-cover" />
                               </div>
                               <div>
                                  <h3 className="font-bold text-foreground">{agency.companyName}</h3>
                                  <div className="flex gap-2">
                                     <Badge className={getAdminVerificationBadgeClass(agency.verificationStatus)}>{getAdminVerificationBadgeLabel(agency.verificationStatus, t)}</Badge>
                                     <Badge variant="outline">{getAdminSubscriptionBadgeLabel(agency.subscriptionStatus, t)}</Badge>
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
                                 <Eye className="h-4 w-4 ms-2" />
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
                <Pagination pagination={allAgenciesPagination} onPageChange={setCurrentPage} labels={paginationLabels} className="mt-2" />
              </div>
            )}

            {activeTab === 'BOOKINGS' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                   <LayoutDashboard className="h-5 w-5 text-sunset-orange" />
                   {t('dashboard.sections.bookingMonitor')} ({allBookingsPagination?.total ?? allBookings.length})
                </h2>
                {bookingFeedback && (
                  <div className={`text-sm font-medium ${bookingFeedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
                    {bookingFeedback.message}
                  </div>
                )}
                <div className="bg-card rounded-3xl overflow-hidden shadow-sm border border-border">
                   <div className="overflow-x-auto">
                   <table className="w-full text-start">
                      <thead className="bg-muted text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                         <tr>
                            <th className="px-6 py-4">{t('dashboard.table.booking')}</th>
                            <th className="px-6 py-4">{t('dashboard.table.traveler')}</th>
                            <th className="px-6 py-4">{t('dashboard.table.status')}</th>
                            <th className="px-6 py-4 text-end">{t('dashboard.table.amount')}</th>
                            <th className="px-6 py-4 text-end">{t('dashboard.table.action')}</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                         {allBookings.map((booking) => {
                            const canRefund = booking.paymentMethod === PaymentMethod.Gateway
                              && booking.paymentStatus === BookingPaymentStatus.Paid
                              && Boolean(booking.paymentGatewayTransactionId);

                            return (
                            <tr key={booking.id} className="hover:bg-muted/50 transition-colors">
                               <td className="px-6 py-4">
                                  <p className="font-bold text-sm line-clamp-1">{booking.session.template.title}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono italic">#{booking.id.substring(0, 8)}</p>
                               </td>
                               <td className="px-6 py-4 text-sm font-medium">{booking.traveler.name}</td>
                               <td className="px-6 py-4">
                                <div className="flex flex-col items-start gap-2">
                                  <Badge className="font-black text-[8px] uppercase">{getAdminBookingBadgeLabel(booking.status, t)}</Badge>
                                  <Badge variant="outline" className="text-[8px] font-black uppercase">
                                    {getAdminBookingPaymentBadgeLabel(booking.paymentStatus, t)}
                                  </Badge>
                                </div>
                               </td>
                               <td className="px-6 py-4 text-end font-black">{booking.totalAmount} {booking.session.currency}</td>
                               <td className="px-6 py-4 text-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-border"
                                  disabled={!canRefund || refundBookingMutation.isPending}
                                  onClick={() => {
                                    setBookingFeedback(null);
                                    setPendingConfirmation({ kind: 'refund-booking', booking });
                                  }}
                                >
                                  {t('dashboard.actions.refund')}
                                </Button>
                               </td>
</tr>
                          )})}
                       </tbody>
                    </table>
                    </div>
                 </div>
                 <Pagination pagination={allBookingsPagination} onPageChange={setCurrentPage} labels={paginationLabels} className="mt-2" />
              </div>
            )}

            {activeTab === 'PAYMENT_PROOFS' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-sunset-orange" />
                    {t('dashboard.sections.pendingPaymentProofs')} ({pendingPaymentProofsPagination?.total ?? pendingPaymentProofs.length})
                 </h2>
                 {paymentProofFeedback && (
                   <div className={`text-sm font-medium ${paymentProofFeedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
                     {paymentProofFeedback.message}
                   </div>
                 )}
                 <div className="bg-card rounded-3xl overflow-hidden shadow-sm border border-border">
                    {pendingPaymentProofs.length ? (
                      <div className="overflow-x-auto">
                      <table className="w-full text-start">
                        <thead className="bg-muted text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                           <tr>
                              <th className="px-6 py-4">{t('dashboard.table.booking')}</th>
                              <th className="px-6 py-4">{t('dashboard.table.traveler')}</th>
                              <th className="px-6 py-4">{t('dashboard.table.amount')}</th>
                              <th className="px-6 py-4">{t('dashboard.table.submitted')}</th>
                              <th className="px-6 py-4 text-end">{t('dashboard.table.action')}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                           {pendingPaymentProofs.map((payment) => {
                             const proofStatus = payment.booking?.paymentProof?.status;
                             const canApprove = canApprovePaymentProof(proofStatus);
                             const canReject = canRejectPaymentProof(proofStatus);
                             return (
                                <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                                 <td className="px-6 py-4">
                                    <p className="font-bold text-sm">{payment.booking?.session?.template?.title || t('dashboard.labels.booking')}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono italic">#{payment.booking?.id?.substring(0, 8)}</p>
                                 </td>
                                 <td className="px-6 py-4 text-sm font-medium">
                                    {payment.booking?.traveler?.name || t('dashboard.labels.traveler')}
                                 </td>
                                 <td className="px-6 py-4 text-sm font-semibold">
                                   {payment.booking?.totalAmount ?? payment.amount} {payment.booking?.session.currency ?? t('dashboard.labels.currency')}
                                 </td>
                                 <td className="px-6 py-4 text-sm text-muted-foreground">
                                    {payment.uploadedAt ? new Date(payment.uploadedAt).toLocaleDateString() : t('dashboard.labels.na')}
                                 </td>
                                 <td className="px-6 py-4 text-end flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-border"
                                      onClick={() => handleViewPaymentProof(payment.booking?.id || payment.bookingId)}
                                      disabled={viewingProofId === (payment.booking?.id || payment.bookingId)}
                                    >
                                      <Eye className="h-4 w-4 ms-2" />
                                      {viewingProofId === (payment.booking?.id || payment.bookingId) ? t('dashboard.messages.loading') : t('dashboard.actions.view')}
                                    </Button>
                                      <Button
                                        size="sm"
                                        className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
                                        disabled={!canReject || verifyPaymentMutation.isPending}
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
                                        className="bg-success text-success-foreground hover:bg-success/90 border-none"
                                        disabled={!canApprove || verifyPaymentMutation.isPending}
                                        onClick={() => verifyPaymentMutation.mutate({ id: payment.id, status: VerificationStatus.Verified })}
                                      >
                                        {t('dashboard.actions.approve')}
                                      </Button>
                                   </td>
                                </tr>
                             );
})}
                         </tbody>
                       </table>
                      </div>
                    ) : (
                      <div className="p-10 text-center text-sm text-muted-foreground">
                        {t('dashboard.messages.noPaymentProofs')}
                      </div>
)}
                  </div>
                  <Pagination pagination={pendingPaymentProofsPagination} onPageChange={setCurrentPage} labels={paginationLabels} className="mt-2" />
               </div>
            )}

            {activeTab === 'PAYOUTS' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                 <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-sunset-orange" />
                    {t('dashboard.sections.payoutRequests')} ({payoutRequestsPagination?.total ?? payoutRequests.length})
                 </h2>
                 <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
                    <div className="space-y-4">
                       {payoutRequests.length ? (
                         payoutRequests.map((payout) => {
                          const payoutMeta = getAdminPayoutBadgeMeta(payout.status, t);
                          const isPendingPayout = payout.status === PayoutStatus.Pending;
                          return (
                          <Card key={payout.id} className="border-none shadow-sm p-5 bg-card">
                             <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                   <p className="text-sm text-muted-foreground">{t('dashboard.labels.requestId', { id: payout.id?.slice(0, 8) ?? '' })}</p>
                                   <h3 className="font-bold text-foreground">{payout.agency?.companyName || t('dashboard.labels.agencyPayout')}</h3>
                                   <p className="text-xs text-muted-foreground">
                                     {payout.requestedAt ? new Date(payout.requestedAt).toLocaleDateString() : t('dashboard.labels.na')} - {payout.amount} {t('dashboard.labels.currency')}
                                   </p>
                                   <p className="text-[11px] font-medium text-muted-foreground">{payoutMeta.helperText}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                   <Badge className={payoutMeta.className}>{payoutMeta.label}</Badge>
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={() => {
                                       setSelectedPayout(payout);
                                       setPayoutFeedback(null);
                                     }}
                                   >
                                     <Eye className="h-4 w-4 ms-2" />
                                     {t('dashboard.actions.details')}
                                   </Button>
                                   <Button
                                     size="sm"
                                     className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
                                     onClick={() => processPayoutMutation.mutate({ id: payout.id, status: PayoutStatus.Rejected })}
                                     disabled={!isPendingPayout || processPayoutMutation.isPending}
                                   >
                                     {t('dashboard.actions.reject')}
                                   </Button>
                                   <Button
                                     size="sm"
                                     className="bg-success text-success-foreground hover:bg-success/90 border-none"
                                     onClick={() => processPayoutMutation.mutate({ id: payout.id, status: PayoutStatus.Paid })}
                                     disabled={!isPendingPayout || processPayoutMutation.isPending}
                                   >
                                     {t('dashboard.actions.approve')}
                                   </Button>
                                </div>
                             </div>
                          </Card>
                       )})
                       ) : (
                         <Card className="border-none shadow-sm p-6 bg-card text-sm text-muted-foreground">
                           {t('dashboard.messages.noPayoutRequests')}
                         </Card>
                       )}
</div>
                     <Pagination pagination={payoutRequestsPagination} onPageChange={setCurrentPage} labels={paginationLabels} className="pt-2" />
                     <Card className="border-none shadow-sm p-6 bg-card h-fit">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-foreground">{t('dashboard.labels.payoutDetails')}</h3>
                        {selectedPayout && (
                          <Badge className="bg-sunset-orange/10 text-sunset-orange">{t('dashboard.labels.selected')}</Badge>
                        )}
                      </div>
                      {!selectedPayout && (
                        <p className="text-sm text-muted-foreground mt-4">{t('dashboard.messages.selectPayoutPrompt')}</p>
                      )}
                      {selectedPayout && (
                        <div className="mt-4 space-y-5">
                          {(() => {
                            const payoutMeta = getAdminPayoutBadgeMeta(selectedPayout.status, t);
                            const isPendingPayout = selectedPayout.status === PayoutStatus.Pending;
                            return (
                              <>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.agency')}</p>
                            <p className="text-base font-bold text-foreground">{selectedPayout.agency?.companyName || t('dashboard.labels.agencyPayout')}</p>
                            <p className="text-sm text-muted-foreground">{selectedPayout.agency?.user?.email}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={payoutMeta.className}>{payoutMeta.label}</Badge>
                            <p className="text-xs font-medium text-muted-foreground">{payoutMeta.helperText}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.requested')}</p>
                              <p className="font-medium text-foreground">{selectedPayout.requestedAt ? new Date(selectedPayout.requestedAt).toLocaleDateString() : t('dashboard.labels.na')}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.amount')}</p>
                              <p className="font-medium text-foreground">{selectedPayout.amount} {t('dashboard.labels.currency')}</p>
                            </div>
                          </div>
                          {selectedPayout.processedAt && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.status')}</p>
                              <p className="font-medium text-foreground">{new Date(selectedPayout.processedAt).toLocaleDateString()}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('dashboard.labels.bankDetails')}</p>
                            <div className="space-y-2 text-sm">
                              {renderBankDetails(selectedPayout.bankDetails)}
                            </div>
                          </div>
                          {payoutFeedback && (
                            <div className={`text-sm font-medium ${payoutFeedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
                              {payoutFeedback.message}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              className="bg-success text-success-foreground hover:bg-success/90 border-none"
                              onClick={() => processPayoutMutation.mutate({ id: selectedPayout.id, status: PayoutStatus.Paid })}
                              disabled={!isPendingPayout || processPayoutMutation.isPending}
                            >
                              {t('dashboard.actions.approvePayout')}
                            </Button>
                            <Button
                              className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
                              onClick={() => processPayoutMutation.mutate({ id: selectedPayout.id, status: PayoutStatus.Rejected })}
                              disabled={!isPendingPayout || processPayoutMutation.isPending}
                            >
                              {t('dashboard.actions.rejectPayout')}
                            </Button>
                          </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </Card>
                 </div>
              </div>
            )}

            {activeTab === 'AUDIT' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <FileText className="h-5 w-5 text-sunset-orange" />
                    {t('dashboard.audit.trail', { total: auditLogsPagination?.total ?? auditLogs.length })}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      className="border-border"
                      onClick={handleExportAuditLogs}
                      disabled={isExportingAuditLogs}
                    >
                      <Download className="h-4 w-4 ms-2" />
                      {isExportingAuditLogs ? t('dashboard.audit.exporting') : t('dashboard.audit.exportCsv')}
                    </Button>
                  </div>
                </div>

                {auditFeedback && (
                  <div className={`text-sm font-medium ${auditFeedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
                    {auditFeedback.message}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.8fr]">
                  <div className="bg-card rounded-3xl overflow-hidden shadow-sm border border-border">
                    {auditLogs.length ? (
                      <div className="overflow-x-auto">
                      <table className="w-full text-start">
                        <thead className="bg-muted text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                          <tr>
                            <th className="px-6 py-4">{t('dashboard.table.when')}</th>
                            <th className="px-6 py-4">{t('dashboard.table.actor')}</th>
                            <th className="px-6 py-4">{t('dashboard.table.action')}</th>
                            <th className="px-6 py-4">{t('dashboard.table.target')}</th>
                            <th className="px-6 py-4">{t('dashboard.table.metadata')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {auditLogs.map((log) => (
                            <tr key={log.id} className="align-top hover:bg-muted/50 transition-colors">
                              <td className="px-6 py-4 text-sm text-muted-foreground">
                                <p className="font-medium text-foreground">{formatDateTime(log.createdAt)}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">#{log.id.slice(0, 8)}</p>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <p className="font-medium text-foreground">{log.actorEmail || t('dashboard.labels.system')}</p>
                                <p className="text-muted-foreground">{log.actorId || t('dashboard.labels.noActorId')}</p>
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-foreground">
                                {log.action}
                              </td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">
                                <p className="font-medium text-foreground">{log.targetType}</p>
                                <p>{log.targetId || t('dashboard.labels.noTargetId')}</p>
                              </td>
                              <td className="px-6 py-4">
                                {renderAuditMetadata(log.metadata)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    ) : (
                      <div className="p-10 text-center text-sm text-muted-foreground">
                        {t('dashboard.audit.noResults')}
                      </div>
                    )}
                  </div>

                  <Card className="border-none shadow-sm p-6 bg-card h-fit">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{t('dashboard.audit.retentionAndExport')}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {t('dashboard.audit.retentionHint')}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-muted p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('dashboard.audit.currentWindow')}</p>
                        <p className="text-sm text-foreground">
                          {t('dashboard.audit.showingEvents', {
                            total: auditLogsPagination?.total ?? auditLogs.length,
                            page: auditLogsPagination?.page ?? 1,
                            totalPages: auditLogsPagination?.totalPages ?? 1,
                          })}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t('dashboard.audit.retentionDays')}
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={retentionDays}
                          onChange={(event) => setRetentionDays(event.target.value)}
                          className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-orange/20"
                        />
                        <p className="text-sm text-muted-foreground">
                          {t('dashboard.audit.pruneHint')}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="bg-deep-blue hover:bg-deep-blue/90 text-white border-none"
                          onClick={handleExportAuditLogs}
                          disabled={isExportingAuditLogs}
                        >
                          <Download className="h-4 w-4 ms-2" />
                          {isExportingAuditLogs ? t('dashboard.audit.exporting') : t('dashboard.audit.downloadCsv')}
                        </Button>
                        <Button
                          className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
                          onClick={handlePruneAuditLogs}
                          disabled={pruneAuditLogsMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 ms-2" />
                          {pruneAuditLogsMutation.isPending ? t('dashboard.audit.pruning') : t('dashboard.audit.pruneOldLogs')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
                <Pagination pagination={auditLogsPagination} onPageChange={setCurrentPage} labels={paginationLabels} className="mt-2" />
              </div>
            )}
         </div>
      </main>

      <ConfirmDialog
        open={Boolean(pendingConfirmation)}
        destructive
        pending={refundBookingMutation.isPending || pruneAuditLogsMutation.isPending}
title={pendingConfirmation?.kind === 'refund-booking' ? t('dashboard.confirm.confirmRefund') : t('dashboard.confirm.pruneAuditLogs')}
        description={pendingConfirmation?.kind === 'refund-booking'
          ? t('dashboard.confirm.refundDescription', {
              id: pendingConfirmation.booking.id.substring(0, 8),
              amount: pendingConfirmation.booking.totalAmount,
              currency: pendingConfirmation.booking.session.currency,
            })
          : t('dashboard.confirm.pruneDescription', { days: pendingConfirmation?.days ?? retentionDays })}
        confirmLabel={pendingConfirmation?.kind === 'refund-booking' ? t('dashboard.confirm.processRefund') : t('dashboard.confirm.deleteOldLogs')}
        onConfirm={handleConfirmAction}
        onOpenChange={(open) => !open && setPendingConfirmation(null)}
      />

      {selectedAgency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <Card className="max-w-2xl w-full border-none shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-foreground">{t('dashboard.modal.agencyReview')}</CardTitle>
                <p className="text-sm text-muted-foreground">{t('dashboard.messages.reviewVerification')}</p>
              </div>
              <Button variant="ghost" onClick={() => setSelectedAgency(null)}>
                <XCircle className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-muted rounded-2xl overflow-hidden">
                  <Image src={selectedAgency.logo || `https://ui-avatars.com/api/?name=${selectedAgency.companyName}`} alt={t('dashboard.labels.agencyLogo', { name: selectedAgency.companyName })} width={56} height={56} className="h-full w-full object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedAgency.companyName}</h3>
                  <p className="text-sm text-muted-foreground">{t('dashboard.labels.ice')}: {selectedAgency.ice || t('dashboard.labels.na')}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.contact')}</p>
                  <p className="font-medium text-foreground">{selectedAgency.user?.name || t('dashboard.messages.notProvided')}</p>
                  <p className="text-muted-foreground">{selectedAgency.user?.email || t('dashboard.messages.noEmail')}</p>
                  <p className="text-muted-foreground">{selectedAgency.user?.phone || t('dashboard.messages.noPhone')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.status')}</p>
                  <div className="flex gap-2">
                    <Badge className={getAdminVerificationBadgeClass(selectedAgency.verificationStatus)}>
                      {getAdminVerificationBadgeLabel(selectedAgency.verificationStatus, t)}
                    </Badge>
                    <Badge variant="outline">{getAdminSubscriptionBadgeLabel(selectedAgency.subscriptionStatus, t)}</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {t('dashboard.labels.joined')} {selectedAgency.user?.createdAt ? new Date(selectedAgency.user.createdAt).toLocaleDateString() : t('dashboard.messages.unknown')}
                  </p>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.agencyAddress')}</p>
                  <p className="text-muted-foreground">{selectedAgency.address || selectedAgency.profile?.address || t('dashboard.messages.noAddress')}</p>
                </div>
              </div>
              {agencyFeedback && (
                <div className={`text-sm font-medium ${agencyFeedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
                  {agencyFeedback.message}
                </div>
              )}
              {(() => {
                const canApprove = canApproveAgency(selectedAgency.verificationStatus);
                const canReject = canRejectAgency(selectedAgency.verificationStatus);
                return (
              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-success text-success-foreground hover:bg-success/90 border-none"
                  onClick={() => verifyAgencyMutation.mutate({ id: selectedAgency.id, status: VerificationStatus.Verified })}
                  disabled={!canApprove || verifyAgencyMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 ms-2" />
                  {t('dashboard.actions.approveAgency')}
                </Button>
                <Button
                  className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
                  onClick={() => verifyAgencyMutation.mutate({ id: selectedAgency.id, status: VerificationStatus.Rejected })}
                  disabled={!canReject || verifyAgencyMutation.isPending}
                >
                  <XCircle className="h-4 w-4 ms-2" />
                  {t('dashboard.actions.rejectAgency')}
                </Button>
              </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
