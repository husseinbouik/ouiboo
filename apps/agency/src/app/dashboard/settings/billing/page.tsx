'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CreditCard,
  Download,
  Receipt,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ouiboo/ui';
import { ConfirmDialog } from '@ouiboo/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SubscriptionStatus, VerificationStatus } from '@ouiboo/types';
import { formatCurrency, formatLocalDate } from '@ouiboo/utils';
import { useAuth } from '@/components/AuthContext';
import { apiClient } from '@/lib/api-client';

type AgencyStatsResponse = {
  revenue?: number;
  totalBookings?: number;
  payments?: {
    totalReceived?: string;
    pendingVerificationAmount?: string;
    currency?: string;
  };
};

type AgencyInvoice = {
  id: string;
  number: string;
  periodStart: string;
  currency: string;
  totalAmount: string;
  issuedAt: string;
};

export default function BillingSettingsPage() {
  const { t, i18n } = useTranslation();
  const [mountedAt] = useState(() => Date.now());
  const { user } = useAuth();
  const agencyProfile = user?.agencyProfile;

  const { data: statsData } = useQuery<AgencyStatsResponse>({
    queryKey: ['agency-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/stats');
      return response.data;
    },
  });

  // #359: platform service fee invoices (billing history). The endpoint
  // returns an empty list until invoices exist, so this card never breaks
  // the page; a hard error only swaps in an "unavailable" note.
  const { data: invoicesData, isError: invoicesError } = useQuery<{ data: AgencyInvoice[] }>({
    queryKey: ['agency-invoices'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/invoices', { params: { page: 1, limit: 24 } });
      return response.data;
    },
  });
  const invoices = invoicesData?.data ?? [];
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const downloadInvoice = async (invoice: AgencyInvoice) => {
    setDownloadingInvoiceId(invoice.id);
    try {
      const response = await apiClient.get(`/agency/invoices/${invoice.id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // Keep the page stable; the button simply re-enables.
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const getSubscriptionMeta = (status?: string) => {
    switch (status) {
      case SubscriptionStatus.Active:
        return {
          badgeClassName: 'border-success/30 bg-success/10 text-success',
          label: t('settings.billing.statusActive'),
          description: t('settings.billing.statusActiveDesc'),
        };
      case SubscriptionStatus.Cancelled:
        return {
          badgeClassName: 'border-danger/30 bg-danger/10 text-danger',
          label: t('settings.billing.statusCancelled'),
          description: t('settings.billing.statusCancelledDesc'),
        };
      case SubscriptionStatus.Expired:
        return {
          badgeClassName: 'border-border bg-muted text-muted-foreground',
          label: t('settings.billing.statusExpired'),
          description: t('settings.billing.statusExpiredDesc'),
        };
      default:
        return {
          badgeClassName: 'border-primary/30 bg-primary/10 text-primary',
          label: t('settings.billing.statusTrial'),
          description: t('settings.billing.statusTrialDesc'),
        };
    }
  };

  const getVerificationLabel = (status?: string) => {
    switch (status) {
      case VerificationStatus.Verified:
        return t('settings.billing.verificationVerified');
      case VerificationStatus.Rejected:
        return t('settings.billing.verificationRejected');
      default:
        return t('settings.billing.verificationPending');
    }
  };

  const subscriptionMeta = getSubscriptionMeta(agencyProfile?.subscriptionStatus);
  const trialEndsAt = agencyProfile?.trialEndsAt ? new Date(agencyProfile.trialEndsAt) : null;
  const subscriptionEndsAt = agencyProfile?.subscriptionEndsAt ? new Date(agencyProfile.subscriptionEndsAt) : null;
  const upcomingBoundary = subscriptionEndsAt || trialEndsAt;
  const hasBankDetails = Boolean(agencyProfile?.bankDetails || agencyProfile?.rib);
  const verificationState = agencyProfile?.verificationStatus || VerificationStatus.Pending;

  // #324: self-serve cancellation (takes effect at the period boundary)
  const queryClient = useQueryClient();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [actionError, setActionError] = useState(false);
  const cancellationScheduled = Boolean(agencyProfile?.cancelAtPeriodEnd);
  const canCancel =
    agencyProfile?.subscriptionStatus === SubscriptionStatus.Trial ||
    agencyProfile?.subscriptionStatus === SubscriptionStatus.Active;
  const boundaryLabel = upcomingBoundary
    ? formatLocalDate(upcomingBoundary, i18n.language, { dateStyle: 'medium' })
    : '';

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/agency/subscription/cancel');
    },
    onSuccess: async () => {
      setCancelDialogOpen(false);
      setActionError(false);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => setActionError(true),
  });
  const resumeMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/agency/subscription/resume');
    },
    onSuccess: async () => {
      setActionError(false);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => setActionError(true),
  });

  const daysUntilBoundary = upcomingBoundary
    ? Math.round((upcomingBoundary.getTime() - mountedAt) / (1000 * 60 * 60 * 24))
    : 0;
  const relativeBoundary = upcomingBoundary
    ? new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' }).format(daysUntilBoundary, 'day')
    : '';

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3 rtl:rotate-180" />
          {t('settings.backToSettings')}
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('settings.billing.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('settings.billing.subtitle')}
          </p>
        </div>
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 border-none gap-2">
              <Link href="/dashboard/wallet">{t('settings.billing.openWallet')}
            <ArrowUpRight className="h-4 w-4 rtl:rotate-90" /></Link>
            </Button>
      </div>

      <Card className="border-none shadow-sm bg-card border border-border">
        <CardHeader className="border-b border-border bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-accent" />
            {t('settings.billing.currentPlan')}
          </CardTitle>
          <CardDescription>
            {t('settings.billing.currentPlanSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${subscriptionMeta.badgeClassName}`}>
              {subscriptionMeta.label}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{subscriptionMeta.description}</p>
              {upcomingBoundary && (
                <p className="text-sm text-muted-foreground">
                  {t('settings.billing.nextBoundary', {
                    date: formatLocalDate(upcomingBoundary, i18n.language, { dateStyle: 'medium' }),
                    relative: relativeBoundary,
                  })}
                </p>
              )}
              {!upcomingBoundary && (
                <p className="text-sm text-muted-foreground">
                  {t('settings.billing.noDeadline')}
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('settings.billing.currentScope')}</p>
            <p className="text-sm text-foreground">
              {t('settings.billing.currentScopeBody')}
            </p>
          </div>
        </CardContent>
      </Card>

      {(canCancel || cancellationScheduled) && (
        <Card className="border-none shadow-sm bg-card border border-border">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-accent" />
              {t('settings.billing.cancelTitle')}
            </CardTitle>
            <CardDescription>{t('settings.billing.cancelBody')}</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {cancellationScheduled ? (
              <>
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-sm font-semibold text-foreground">{t('settings.billing.cancelScheduledTitle')}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {upcomingBoundary
                      ? t('settings.billing.cancelScheduledBody', { date: boundaryLabel })
                      : t('settings.billing.cancelScheduledBodyNoDate')}
                  </p>
                </div>
                <Button onClick={() => resumeMutation.mutate()} disabled={resumeMutation.isPending}>
                  {t('settings.billing.resumeButton')}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  setActionError(false);
                  setCancelDialogOpen(true);
                }}
              >
                {t('settings.billing.cancelButton')}
              </Button>
            )}
            {actionError && <p className="text-sm text-red-600">{t('settings.billing.cancelError')}</p>}
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm bg-card border border-border">
        <CardHeader className="border-b border-border bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-accent" />
            {t('settings.billing.invoicesTitle')}
          </CardTitle>
          <CardDescription>{t('settings.billing.invoicesSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {invoicesError ? (
            <p className="text-sm text-muted-foreground">{t('settings.billing.invoicesUnavailable')}</p>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('settings.billing.invoicesEmpty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {invoices.map((invoice) => (
                <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{invoice.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(new Date(invoice.periodStart))}
                      {' · '}
                      {t('settings.billing.invoiceIssuedOn', {
                        date: formatLocalDate(new Date(invoice.issuedAt), i18n.language, { dateStyle: 'medium' }),
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-bold text-foreground">
                      {formatCurrency(Number(invoice.totalAmount || 0), invoice.currency, i18n.language)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => downloadInvoice(invoice)}
                      disabled={downloadingInvoiceId === invoice.id}
                    >
                      <Download className="h-4 w-4" />
                      {downloadingInvoiceId === invoice.id
                        ? t('settings.billing.invoiceDownloading')
                        : t('settings.billing.invoiceDownload')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title={t('settings.billing.cancelConfirmTitle')}
        description={
          upcomingBoundary
            ? t('settings.billing.cancelConfirmBody', { date: boundaryLabel })
            : t('settings.billing.cancelConfirmBodyNoDate')
        }
        confirmLabel={t('settings.billing.cancelConfirmAction')}
        destructive
        pending={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
      />

      <Card className="border-none shadow-sm bg-card border border-border">
        <CardHeader className="border-b border-border bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            {t('settings.billing.termsTitle')}
          </CardTitle>
          <CardDescription>{t('settings.billing.termsSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm leading-6 text-muted-foreground">
            {t('settings.billing.termsBody', {
              version: agencyProfile?.subscriptionTermsVersion || '1.0',
            })}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-card border border-border">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <Wallet className="h-5 w-5 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('settings.billing.available')}</span>
            </div>
            <p className="text-3xl font-black text-foreground">
              {formatCurrency(Number(statsData?.payments?.totalReceived || 0), statsData?.payments?.currency, i18n.language)}
            </p>
            <p className="text-sm text-muted-foreground">{t('settings.billing.availableHint')}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card border border-border">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('settings.billing.pending')}</span>
            </div>
            <p className="text-3xl font-black text-foreground">
              {formatCurrency(Number(statsData?.payments?.pendingVerificationAmount || 0), statsData?.payments?.currency, i18n.language)}
            </p>
            <p className="text-sm text-muted-foreground">{t('settings.billing.pendingHint')}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card border border-border">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <BadgeCheck className="h-5 w-5 text-success" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('settings.billing.revenue')}</span>
            </div>
            <p className="text-3xl font-black text-foreground">
              {formatCurrency(Number(statsData?.revenue || 0), statsData?.payments?.currency, i18n.language)}
            </p>
            <p className="text-sm text-muted-foreground">{t('settings.billing.revenueHint', { count: statsData?.totalBookings || 0 })}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-card border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t('settings.billing.complianceTitle')}
            </CardTitle>
            <CardDescription>
              {t('settings.billing.complianceSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('settings.billing.verificationStatus')}</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{getVerificationLabel(verificationState)}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('settings.billing.bankDetails')}</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {hasBankDetails ? t('settings.billing.bankConfigured') : t('settings.billing.bankMissing')}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/settings">{t('settings.billing.updateSettings')}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              {t('settings.billing.checklistTitle')}
            </CardTitle>
            <CardDescription>
              {t('settings.billing.checklistSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{t('settings.billing.checklistItem1')}</p>
            <p>{t('settings.billing.checklistItem2')}</p>
            <p>{t('settings.billing.checklistItem3')}</p>
            <div className="pt-2 flex flex-wrap gap-3">
              <Button asChild>
              <Link href="/dashboard/wallet">{t('settings.billing.managePayouts')}</Link>
            </Button>
              <Button asChild variant="outline">
              <Link href="/dashboard/analytics">{t('settings.billing.viewAnalytics')}</Link>
            </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
