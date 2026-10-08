'use client';

import type { AxiosError } from 'axios';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Users,
  MapPin,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  CalendarClock,
  FileText,
  LayoutDashboard,
} from 'lucide-react';
import { ConfirmDialog } from '@ouiboo/ui';
import { useAuth } from '@/components/AuthContext';
import { toPaginatedList } from '@ouiboo/utils';
import {
  BookingPaymentStatus,
  PaymentMethod,
  PayoutStatus,
  TripStatus,
  VerificationStatus,
  type VerificationStatusType,
} from '@ouiboo/types';
import { useTranslation } from 'react-i18next';
import type {
  AdminTab,
  AdminAgency,
  AdminTrip,
  AdminBooking,
  AdminPaymentProof,
  AdminPayoutRequest,
  AdminAuditLog,
  AdminOverviewCounts,
  ApiErrorResponse,
  FeedbackState,
  PendingConfirmation,
} from '@/components/dashboard/types';
import { isAdminTab, getErrorMessage } from '@/components/dashboard/dashboard-utils';
import { useAdminListQuery } from '@/components/dashboard/useAdminListQuery';
import DashboardShell from '@/components/dashboard/DashboardShell';
import PendingTab from '@/components/dashboard/PendingTab';
import AgenciesTab from '@/components/dashboard/AgenciesTab';
import BookingsTab from '@/components/dashboard/BookingsTab';
import PaymentProofsTab from '@/components/dashboard/PaymentProofsTab';
import PayoutsTab from '@/components/dashboard/PayoutsTab';
import AuditTab from '@/components/dashboard/AuditTab';
import AgencyReviewModal from '@/components/dashboard/AgencyReviewModal';

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

  const pendingAgenciesList = useAdminListQuery<AdminAgency>('/admin/pending-agencies', 'pending-agencies', activeTab === 'PENDING', activeTab, debouncedQuery, currentPage);
  const pendingAgencies = pendingAgenciesList.data;
  const pendingAgenciesPagination = pendingAgenciesList.pagination;

  const pendingTripsList = useAdminListQuery<AdminTrip>('/admin/pending-trips', 'pending-trips', activeTab === 'PENDING', activeTab, debouncedQuery, currentPage);
  const pendingTrips = pendingTripsList.data;
  const pendingTripsPagination = pendingTripsList.pagination;

  const allAgenciesList = useAdminListQuery<AdminAgency>('/admin/agencies', 'all-agencies', activeTab === 'AGENCIES', activeTab, debouncedQuery, currentPage);
  const allAgencies = allAgenciesList.data;
  const allAgenciesPagination = allAgenciesList.pagination;

  const allBookingsList = useAdminListQuery<AdminBooking>('/admin/bookings', 'all-bookings', activeTab === 'BOOKINGS', activeTab, debouncedQuery, currentPage);
  const allBookings = allBookingsList.data;
  const allBookingsPagination = allBookingsList.pagination;

  const pendingPaymentProofsList = useAdminListQuery<AdminPaymentProof>('/admin/pending-payments', 'pending-payments', activeTab === 'PAYMENT_PROOFS', activeTab, debouncedQuery, currentPage);
  const pendingPaymentProofs = pendingPaymentProofsList.data;
  const pendingPaymentProofsPagination = pendingPaymentProofsList.pagination;

  const payoutRequestsList = useAdminListQuery<AdminPayoutRequest>('/admin/payout-requests', 'payout-requests', activeTab === 'PAYOUTS', activeTab, debouncedQuery, currentPage);
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

  return (
    <>
      <DashboardShell
        t={t}
        activeTab={activeTab}
        navItems={navItems.map((item) => ({ ...item }))}
        onTabChange={handleTabChange}
        currentTab={currentTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        summaryCards={summaryCards}
        onLogout={logout}
      >
        {activeTab === 'PENDING' && (
          <PendingTab
            t={t}
            pendingAgencies={pendingAgencies}
            pendingAgenciesPagination={pendingAgenciesPagination}
            pendingTrips={pendingTrips}
            pendingTripsPagination={pendingTripsPagination}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            paginationLabels={paginationLabels}
            agencyFeedback={agencyFeedback}
            onSelectAgency={(agency) => {
              setSelectedAgency(agency);
              setAgencyFeedback(null);
            }}
            onVerifyAgency={(id, status) => verifyAgencyMutation.mutate({ id, status })}
            isVerifyingAgency={verifyAgencyMutation.isPending}
            onVerifyTrip={(id, status) => verifyTripMutation.mutate({ id, status })}
            isVerifyingTrip={verifyTripMutation.isPending}
          />
        )}
        {activeTab === 'AGENCIES' && (
          <AgenciesTab
            t={t}
            agencies={allAgencies}
            pagination={allAgenciesPagination}
            onPageChange={setCurrentPage}
            paginationLabels={paginationLabels}
            onSelectAgency={(agency) => {
              setSelectedAgency(agency);
              setAgencyFeedback(null);
            }}
            onUpdateAgencyStatus={(id, verificationStatus) =>
              updateAgencyStatusMutation.mutate({ id, verificationStatus })
            }
          />
        )}
        {activeTab === 'BOOKINGS' && (
          <BookingsTab
            t={t}
            bookings={allBookings}
            pagination={allBookingsPagination}
            onPageChange={setCurrentPage}
            paginationLabels={paginationLabels}
            bookingFeedback={bookingFeedback}
            isRefunding={refundBookingMutation.isPending}
            onRequestRefund={(booking) => setPendingConfirmation({ kind: 'refund-booking', booking })}
          />
        )}
        {activeTab === 'PAYMENT_PROOFS' && (
          <PaymentProofsTab
            t={t}
            proofs={pendingPaymentProofs}
            pagination={pendingPaymentProofsPagination}
            onPageChange={setCurrentPage}
            paginationLabels={paginationLabels}
            paymentProofFeedback={paymentProofFeedback}
            viewingProofId={viewingProofId}
            isVerifying={verifyPaymentMutation.isPending}
            onViewProof={handleViewPaymentProof}
            onVerifyPayment={(id, status) => verifyPaymentMutation.mutate({ id, status })}
          />
        )}
        {activeTab === 'PAYOUTS' && (
          <PayoutsTab
            t={t}
            payouts={payoutRequests}
            pagination={payoutRequestsPagination}
            onPageChange={setCurrentPage}
            paginationLabels={paginationLabels}
            payoutFeedback={payoutFeedback}
            selectedPayout={selectedPayout}
            isProcessing={processPayoutMutation.isPending}
            onSelectPayout={setSelectedPayout}
            onProcessPayout={(id, status) => processPayoutMutation.mutate({ id, status })}
          />
        )}
        {activeTab === 'AUDIT' && (
          <AuditTab
            t={t}
            logs={auditLogs}
            pagination={auditLogsPagination}
            onPageChange={setCurrentPage}
            paginationLabels={paginationLabels}
            auditFeedback={auditFeedback}
            retentionDays={retentionDays}
            onRetentionDaysChange={setRetentionDays}
            isExporting={isExportingAuditLogs}
            isPruning={pruneAuditLogsMutation.isPending}
            onExportAuditLogs={handleExportAuditLogs}
            onPruneAuditLogs={handlePruneAuditLogs}
          />
        )}
      </DashboardShell>

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
        <AgencyReviewModal
          t={t}
          agency={selectedAgency}
          agencyFeedback={agencyFeedback}
          isVerifying={verifyAgencyMutation.isPending}
          onClose={() => setSelectedAgency(null)}
          onVerify={(id, status) => verifyAgencyMutation.mutate({ id, status })}
        />
      )}
    </>
  );
}
