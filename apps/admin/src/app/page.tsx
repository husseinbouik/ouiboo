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
  Layers,
  Receipt,
  RotateCcw,
  KeyRound,
} from 'lucide-react';
import { ConfirmDialog, CardListSkeleton } from '@ouiboo/ui';
import { useAuth } from '@/components/AuthContext';
import { toPaginatedList } from '@ouiboo/utils';
import {
  BookingPaymentStatus,
  LicenceStatus,
  PaymentMethod,
  TripStatus,
  VerificationStatus,
  type LicenceStatusType,
  type VerificationStatusType,
} from '@ouiboo/types';
import { useTranslation } from 'react-i18next';
import type {
  AdminTab,
  AdminAgency,
  AdminTrip,
  AdminBooking,
  AdminPaymentProof,
  AdminAuditLog,
  AdminInvoice,
  AdminPendingGroup,
  AdminRefundCase,
  AdminBetaMetrics,
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
import GroupsTab from '@/components/dashboard/GroupsTab';
import PaymentProofsTab from '@/components/dashboard/PaymentProofsTab';
import AuditTab from '@/components/dashboard/AuditTab';
import InvoicesTab from '@/components/dashboard/InvoicesTab';
import RefundsTab from '@/components/dashboard/RefundsTab';
import BetaMetricsPanel from '@/components/dashboard/BetaMetricsPanel';
import { countRefundUrgency, filterRefundCasesByUrgency, type RefundUrgency } from '@/components/dashboard/refund-urgency';
import SecurityTab from '@/components/dashboard/SecurityTab';
import AgencyReviewModal from '@/components/dashboard/AgencyReviewModal';

/**
 * #469: first-load placeholder for a dashboard tab. Shown only while the
 * tab's list query is cold-loading with nothing to display, so tabs no
 * longer flash their empty state before data arrives.
 */
function AdminTabSkeleton({ label, text }: { label: string; text: string }) {
  return (
    <div role="status" aria-label={label}>
      <CardListSkeleton rows={5} />
      <span className="sr-only">{text}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('PENDING');
  const [selectedAgency, setSelectedAgency] = useState<AdminAgency | null>(null);
  const [viewingProofId, setViewingProofId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  // #416C: refunds tab view — all cases, or the risk-based audit queue.
  const [refundsAuditQueue, setRefundsAuditQueue] = useState(false);
  // #559: urgency pre-filter set by the summary-card deep links.
  const [refundsUrgencyFilter, setRefundsUrgencyFilter] = useState<RefundUrgency | null>(null);
  const [agencyFeedback, setAgencyFeedback] = useState<FeedbackState | null>(null);
  const [paymentProofFeedback, setPaymentProofFeedback] = useState<FeedbackState | null>(null);
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

  // Sync the active tab from the ?tab= URL param (deep links, back/forward
  // navigation). State is adjusted during render, per React docs, instead of
  // in an effect. The guard tracks the last param seen so a local tab change
  // (which writes the same param via history.replaceState) is not reapplied.
  const requestedTabParam = searchParams.get('tab');
  const [syncedTabParam, setSyncedTabParam] = useState<string | null>(null);
  if (requestedTabParam !== syncedTabParam) {
    setSyncedTabParam(requestedTabParam);
    if (isAdminTab(requestedTabParam)) {
      setActiveTab(requestedTabParam);
    }
  }

  // Reset pagination whenever the tab or the debounced search changes,
  // adjusted during render for the same reason.
  const [lastResetKey, setLastResetKey] = useState('');
  const resetKey = `${activeTab}|${debouncedQuery}`;
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setCurrentPage(1);
  }

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

  // #559: beta-metrics panel (#432 service) — the beta exit criteria the
  // operator watches from the dashboard's landing tab.
  const betaMetricsQuery = useQuery<AdminBetaMetrics>({
    queryKey: ['admin-beta-metrics'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/analytics/beta-metrics');
      return response.data;
    },
    staleTime: 60_000,
  });

  // #559: refund urgency is derived client-side from one case list (the
  // refunds API has no due-date filter). The same list + derivation feed
  // both the summary counters and the pre-filtered queue, so they agree.
  // The beta operates at a handful of agencies, well under this page size.
  const refundsUrgencyRaw = useQuery<unknown>({
    queryKey: ['admin-refunds-urgency'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/refunds', { params: { page: 1, limit: 100 } });
      return response.data;
    },
    staleTime: 30_000,
  });
  const { data: refundsUrgencyCases = [] } = toPaginatedList<AdminRefundCase>(refundsUrgencyRaw.data);
  const refundUrgencyCounts = countRefundUrgency(refundsUrgencyCases);
  const refundsOverdueCount = overviewCounts?.refundsOverdue ?? refundUrgencyCounts.overdue;
  const refundsDue48Count = overviewCounts?.refundsDueWithin48h ?? refundUrgencyCounts.due48;
  const openRefundsWithUrgency = (urgency: RefundUrgency) => {
    setRefundsUrgencyFilter(urgency);
    setRefundsAuditQueue(false);
    setCurrentPage(1);
    handleTabChange('REFUNDS');
  };

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

  const pendingGroupsList = useAdminListQuery<AdminPendingGroup>('/admin/groups/pending', 'pending-groups', activeTab === 'GROUPS', activeTab, debouncedQuery, currentPage);
  const pendingGroups = pendingGroupsList.data;
  const pendingGroupsPagination = pendingGroupsList.pagination;

  const pendingPaymentProofsList = useAdminListQuery<AdminPaymentProof>('/admin/pending-payments', 'pending-payments', activeTab === 'PAYMENT_PROOFS', activeTab, debouncedQuery, currentPage);
  const pendingPaymentProofs = pendingPaymentProofsList.data;
  const pendingPaymentProofsPagination = pendingPaymentProofsList.pagination;

  const invoicesList = useAdminListQuery<AdminInvoice>('/admin/invoices', 'invoices', activeTab === 'INVOICES', activeTab, debouncedQuery, currentPage);
  const invoices = invoicesList.data;
  const invoicesPagination = invoicesList.pagination;

  const refundCasesList = useAdminListQuery<AdminRefundCase>('/admin/refunds', 'refunds', activeTab === 'REFUNDS', activeTab, debouncedQuery, currentPage, refundsAuditQueue ? { auditQueue: 'true' } : undefined);
  const refundCases = refundCasesList.data;
  const refundCasesPagination = refundCasesList.pagination;

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

  // #371: travel licence verification (Law 11-16) — separate from identity.
  // #415: verifying now requires the admin's Ministry-list attestation.
  const verifyLicenceMutation = useMutation({
    mutationFn: async ({ id, status, ministryChecked }: { id: string, status: LicenceStatusType, ministryChecked?: boolean }) => {
      return apiClient.post(`/admin/agencies/${id}/licence/verify`, {
        status,
        ministryChecked: status === LicenceStatus.Verified ? ministryChecked === true : undefined,
      });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['pending-agencies'] });
      void queryClient.invalidateQueries({ queryKey: ['all-agencies'] });
      setAgencyFeedback({
        type: 'success',
        message: variables.status === LicenceStatus.Verified
          ? t('dashboard.feedback.licenceVerified')
          : t('dashboard.feedback.licenceRejected')
      });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      setAgencyFeedback({
        type: 'error',
        message: getErrorMessage(error, t('dashboard.feedback.licenceUpdateError'))
      });
    }
  });

  // #415: RC insurance artefact verification — mirrors the licence flow.
  const verifyInsuranceMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string, status: LicenceStatusType, reason?: string }) => {
      return apiClient.post(`/admin/agencies/${id}/insurance/verify`, { status, reason });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['pending-agencies'] });
      void queryClient.invalidateQueries({ queryKey: ['all-agencies'] });
      setAgencyFeedback({
        type: 'success',
        message: variables.status === LicenceStatus.Verified
          ? t('dashboard.feedback.insuranceVerified')
          : t('dashboard.feedback.insuranceRejected')
      });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      setAgencyFeedback({
        type: 'error',
        message: getErrorMessage(error, t('dashboard.feedback.insuranceUpdateError'))
      });
    }
  });

  // #421: payment-destination verification — a holder-name mismatch can
  // only pass with a recorded override reason; rejection needs a reason.
  const verifyBankDetailsMutation = useMutation({
    mutationFn: async ({ id, status, reason, overrideReason }: { id: string, status: VerificationStatusType, reason?: string, overrideReason?: string }) => {
      return apiClient.post(`/admin/agencies/${id}/bank-details/verify`, { status, reason, overrideReason });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['pending-agencies'] });
      void queryClient.invalidateQueries({ queryKey: ['all-agencies'] });
      setAgencyFeedback({
        type: 'success',
        message: variables.status === VerificationStatus.Verified
          ? t('dashboard.feedback.bankDetailsVerified')
          : t('dashboard.feedback.bankDetailsRejected')
      });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      setAgencyFeedback({
        type: 'error',
        message: getErrorMessage(error, t('dashboard.feedback.bankDetailsUpdateError'))
      });
    }
  });

  // #415: private verification documents (licence scan, RC certificate)
  // are only ever opened through a short-lived signed URL — never the
  // public media route. The API allows admins to mint one for any key.
  const handleViewPrivateDocument = async (key: string) => {
    if (!key) {
      return;
    }
    try {
      const response = await apiClient.get('/upload/signed-url', { params: { key } });
      const url = response.data?.url as string | undefined;
      if (!url) {
        throw new Error('Missing signed URL');
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setAgencyFeedback({
        type: 'error',
        message: getErrorMessage(error as AxiosError<ApiErrorResponse>, t('dashboard.feedback.documentLoadError')),
      });
    }
  };

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

  const { data: auditLogsRaw, isLoading: auditLogsLoading } = useQuery<unknown>({
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
        // #422: the VERIFIED wire value is the API's accept decision — the
        // feedback copy (paymentProofApproved) says "accepted — pending
        // bank confirmation", never that the payment is settled.
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
    },
    {
      // #559: the solo operator's daily chase — one click to the queue.
      label: t('dashboard.summary.refundsOverdue'),
      value: refundsOverdueCount,
      icon: RotateCcw,
      tone: 'bg-danger/10 text-danger',
      onClick: () => openRefundsWithUrgency('overdue')
    },
    {
      label: t('dashboard.summary.refundsDue48'),
      value: refundsDue48Count,
      icon: CalendarClock,
      tone: 'bg-warning/10 text-warning',
      onClick: () => openRefundsWithUrgency('due48')
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
    GROUPS: {
      title: t('dashboard.meta.groups.title'),
      description: t('dashboard.meta.groups.description'),
      searchPlaceholder: t('dashboard.meta.groups.searchPlaceholder')
    },
    PAYMENT_PROOFS: {
      title: t('dashboard.meta.paymentProofs.title'),
      description: t('dashboard.meta.paymentProofs.description'),
      searchPlaceholder: t('dashboard.meta.paymentProofs.searchPlaceholder')
    },
    AUDIT: {
      title: t('dashboard.meta.audit.title'),
      description: t('dashboard.meta.audit.description'),
      searchPlaceholder: t('dashboard.meta.audit.searchPlaceholder')
    }
,
    INVOICES: {
      title: t('dashboard.meta.invoices.title'),
      description: t('dashboard.meta.invoices.description'),
      searchPlaceholder: t('dashboard.meta.invoices.searchPlaceholder')
    },
    REFUNDS: {
      title: t('dashboard.meta.refunds.title'),
      description: t('dashboard.meta.refunds.description'),
      searchPlaceholder: t('dashboard.meta.refunds.searchPlaceholder')
    },
    SECURITY: {
      title: t('dashboard.meta.security.title'),
      description: t('dashboard.meta.security.description'),
      searchPlaceholder: t('dashboard.meta.security.searchPlaceholder')
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
      key: 'GROUPS',
      label: t('dashboard.tabs.groups'),
      icon: Layers,
      count: pendingGroupsPagination?.total ?? pendingGroups.length,
    },
    {
      key: 'PAYMENT_PROOFS',
      label: t('dashboard.tabs.paymentProofs'),
      icon: CreditCard,
      count: overviewCounts?.pendingPaymentProofs ?? pendingPaymentProofs.length,
    },
    {
      key: 'AUDIT',
      label: t('dashboard.tabs.audit'),
      icon: FileText,
      count: overviewCounts?.auditLogs ?? auditLogs.length,
    },
    {
      key: 'INVOICES',
      label: t('dashboard.tabs.invoices'),
      icon: Receipt,
      count: invoicesPagination?.total ?? invoices.length,
    },
    {
      key: 'REFUNDS',
      label: t('dashboard.tabs.refunds'),
      icon: RotateCcw,
      count: refundCasesPagination?.total ?? refundCases.length,
    },
    {
      key: 'SECURITY',
      label: t('dashboard.tabs.security'),
      icon: KeyRound,
    },
  ] as const;

  const currentTab = tabMeta[activeTab];

  // #469: a tab shows its skeleton only on a cold load with no rows yet;
  // with placeholder/cached data the tab itself stays on screen.
  const showPendingSkeleton =
    (pendingAgenciesList.isLoading || pendingTripsList.isLoading) &&
    pendingAgencies.length === 0 &&
    pendingTrips.length === 0;
  const showAgenciesSkeleton = allAgenciesList.isLoading && allAgencies.length === 0;
  const showBookingsSkeleton = allBookingsList.isLoading && allBookings.length === 0;
  const showGroupsSkeleton = pendingGroupsList.isLoading && pendingGroups.length === 0;
  const showPaymentProofsSkeleton =
    pendingPaymentProofsList.isLoading && pendingPaymentProofs.length === 0;
  const showAuditSkeleton = auditLogsLoading && auditLogs.length === 0;
  const showInvoicesSkeleton = invoicesList.isLoading && invoices.length === 0;
  const showRefundsSkeleton = refundCasesList.isLoading && refundCases.length === 0;

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
        {activeTab === 'PENDING' && showPendingSkeleton && (
          <AdminTabSkeleton label={t('loading.label')} text={t('loading.text')} />
        )}
        {activeTab === 'PENDING' && !showPendingSkeleton && (
          <>
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
          {/* #559: #432 beta-metrics panel on the operator's landing tab. */}
          <BetaMetricsPanel
            t={t}
            metrics={betaMetricsQuery.data ?? null}
            isLoading={betaMetricsQuery.isLoading}
            isError={betaMetricsQuery.isError}
          />
          </>
        )}
        {activeTab === 'AGENCIES' && showAgenciesSkeleton && (
          <AdminTabSkeleton label={t('loading.label')} text={t('loading.text')} />
        )}
        {activeTab === 'AGENCIES' && !showAgenciesSkeleton && (
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
        {activeTab === 'BOOKINGS' && showBookingsSkeleton && (
          <AdminTabSkeleton label={t('loading.label')} text={t('loading.text')} />
        )}
        {activeTab === 'BOOKINGS' && !showBookingsSkeleton && (
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
        {activeTab === 'GROUPS' && showGroupsSkeleton && (
          <AdminTabSkeleton label={t('loading.label')} text={t('loading.text')} />
        )}
        {activeTab === 'GROUPS' && !showGroupsSkeleton && (
          <GroupsTab
            t={t}
            groups={pendingGroups}
            pagination={pendingGroupsPagination}
            onPageChange={setCurrentPage}
            paginationLabels={paginationLabels}
          />
        )}
        {activeTab === 'PAYMENT_PROOFS' && showPaymentProofsSkeleton && (
          <AdminTabSkeleton label={t('loading.label')} text={t('loading.text')} />
        )}
        {activeTab === 'PAYMENT_PROOFS' && !showPaymentProofsSkeleton && (
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
        {activeTab === 'AUDIT' && showAuditSkeleton && (
          <AdminTabSkeleton label={t('loading.label')} text={t('loading.text')} />
        )}
        {activeTab === 'AUDIT' && !showAuditSkeleton && (
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

        {activeTab === 'INVOICES' && showInvoicesSkeleton && (
          <AdminTabSkeleton label={t('loading.label')} text={t('loading.text')} />
        )}
        {activeTab === 'INVOICES' && !showInvoicesSkeleton && (
          <InvoicesTab
            t={t}
            invoices={invoices}
            pagination={invoicesPagination}
            onPageChange={setCurrentPage}
            paginationLabels={paginationLabels}
          />
        )}

        {activeTab === 'SECURITY' && (
          <SecurityTab t={t} />
        )}

        {activeTab === 'REFUNDS' && showRefundsSkeleton && (
          <AdminTabSkeleton label={t('loading.label')} text={t('loading.text')} />
        )}
        {activeTab === 'REFUNDS' && !showRefundsSkeleton && (
          <RefundsTab
            t={t}
            cases={
              refundsUrgencyFilter
                ? filterRefundCasesByUrgency(refundsUrgencyCases, refundsUrgencyFilter)
                : refundCases
            }
            pagination={refundsUrgencyFilter ? null : refundCasesPagination}
            onPageChange={setCurrentPage}
            paginationLabels={paginationLabels}
            auditQueue={refundsAuditQueue}
            onAuditQueueChange={(value) => {
              setRefundsAuditQueue(value);
              setRefundsUrgencyFilter(null);
              setCurrentPage(1);
            }}
            urgencyFilter={refundsUrgencyFilter}
            onClearUrgencyFilter={() => setRefundsUrgencyFilter(null)}
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
          isVerifyingLicence={verifyLicenceMutation.isPending}
          isVerifyingInsurance={verifyInsuranceMutation.isPending}
          isVerifyingBankDetails={verifyBankDetailsMutation.isPending}
          onClose={() => setSelectedAgency(null)}
          onVerify={(id, status) => verifyAgencyMutation.mutate({ id, status })}
          onVerifyLicence={(id, status, opts) => verifyLicenceMutation.mutate({ id, status, ministryChecked: opts?.ministryChecked })}
          onVerifyInsurance={(id, status, reason) => verifyInsuranceMutation.mutate({ id, status, reason })}
          onVerifyBankDetails={(id, status, opts) => verifyBankDetailsMutation.mutate({ id, status, reason: opts?.reason, overrideReason: opts?.overrideReason })}
          onViewDocument={handleViewPrivateDocument}
        />
      )}
    </>
  );
}
