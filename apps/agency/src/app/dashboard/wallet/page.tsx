'use client';

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Label,
  Textarea,
  Pagination
} from '@ouiboo/ui';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  History
} from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { PayoutStatus, type PayoutDetails } from '@ouiboo/types';
import { cn } from '@ouiboo/ui/utils';
import { formatCurrency, formatLocalDate, toPaginatedList } from '@ouiboo/utils';
import { useAuth } from '@/components/AuthContext';

export default function WalletPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [payoutAmount, setPayoutAmount] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAYOUTS_PAGE_LIMIT = 10;

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['agency-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/stats');
      return response.data;
    }
  });

  const { data: rawPayouts, isLoading: payoutsLoading } = useQuery<unknown>({
    queryKey: ['agency-payouts', currentPage],
    queryFn: async () => {
      const response = await apiClient.get('/agency/payouts', {
        params: { page: currentPage, limit: PAYOUTS_PAGE_LIMIT },
      });
      return response.data;
    },
    placeholderData: (prev: unknown) => prev,
  });
  const { data: payouts = [], pagination: payoutsPagination } =
    toPaginatedList<PayoutDetails>(rawPayouts);

  const wallet = statsData?.wallet || { availableBalance: 0, pendingBalance: 0 };
  const currency = wallet.currency || 'MAD';
  const availableBalance = Number(wallet.availableBalance || 0);
  const initialBankDetails = useMemo(
    () => user?.agencyProfile?.bankDetails ?? '',
    [user?.agencyProfile?.bankDetails],
  );
  const effectiveBankDetails = bankDetails || initialBankDetails;
  const hasBankDetails = effectiveBankDetails.trim().length > 0;

  const getPayoutStatusMeta = (status: PayoutStatus) => {
    if (status === PayoutStatus.Paid) {
      return {
        className: 'bg-success/10 text-success shadow-sm',
        description: t('wallet.payoutStatus.paid'),
      };
    }

    if (status === PayoutStatus.Rejected) {
      return {
        className: 'bg-danger/10 text-danger shadow-sm',
        description: t('wallet.payoutStatus.rejected'),
      };
    }

    if (status === PayoutStatus.Approved) {
      return {
        className: 'bg-primary/10 text-primary shadow-sm',
        description: t('wallet.payoutStatus.approved'),
      };
    }

    return {
      className: 'bg-warning/10 text-warning shadow-sm',
      description: t('wallet.payoutStatus.pending'),
    };
  };

  const getPayoutStatusLabel = (status: PayoutStatus) => {
    if (status === PayoutStatus.Paid) return t('status.payoutPaid');
    if (status === PayoutStatus.Approved) return t('status.payoutApproved');
    if (status === PayoutStatus.Rejected) return t('status.payoutRejected');
    return t('status.payoutPending');
  };

  const payoutMutation = useMutation({
    mutationFn: async (payload: { amount: number; bankDetails: string }) => {
      await apiClient.post('/agency/payouts', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-stats'] });
      queryClient.invalidateQueries({ queryKey: ['agency-payouts'] });
      setPayoutAmount('');
      setPayoutError(null);
      setPayoutSuccess(t('wallet.requestSuccess'));
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      setPayoutSuccess(null);
      setPayoutError(error?.response?.data?.message || t('wallet.requestError'));
    }
  });

  const handleRequestPayout = () => {
    setPayoutError(null);
    setPayoutSuccess(null);

    const amountValue = Number(payoutAmount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setPayoutError(t('wallet.invalidAmount'));
      return;
    }
    if (amountValue > availableBalance) {
      setPayoutError(t('wallet.exceedsBalance'));
      return;
    }
    if (!hasBankDetails) {
      setPayoutError(t('wallet.missingBankDetails'));
      return;
    }

    payoutMutation.mutate({ amount: amountValue, bankDetails: effectiveBankDetails.trim() });
  };

  const handleScrollToRequest = () => {
    const section = document.getElementById('request-payout');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
           {t('wallet.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
           {t('wallet.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available Balance */}
        <Card className="border-none shadow-lg bg-primary text-primary-foreground relative overflow-hidden">
          <CardContent className="p-8 space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="bg-primary-foreground/10 p-2 rounded-lg text-primary-foreground">
                <WalletIcon className="h-6 w-6" />
              </div>
              <Badge variant="success" className="bg-success/20 border-success/30 font-bold uppercase text-[10px]">{t('wallet.paidBadge')}</Badge>
            </div>
            <div>
              <p className="text-primary-foreground/80 text-xs font-bold uppercase tracking-wider">{t('wallet.availableBalance')}</p>
              <h2 className="text-4xl font-black mt-1">
                {formatCurrency(availableBalance, currency, i18n.language)}
              </h2>
            </div>
            <Button
              onClick={handleScrollToRequest}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 border-none shadow-lg shadow-accent/20 font-bold py-6 group transition-all"
            >
              {t('wallet.requestAction')} <ArrowUpRight className="ms-2 h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform rtl:group-hover:-translate-x-1" />
            </Button>
          </CardContent>
          <div className="absolute -bottom-12 -end-12 w-48 h-48 bg-accent/10 rounded-full blur-3xl"></div>
        </Card>

        {/* Pending Balance */}
        <Card className="border-none shadow-sm bg-card border border-border">
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="bg-warning/10 p-2 rounded-lg text-warning">
                <Clock className="h-6 w-6" />
              </div>
              <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20 uppercase text-[10px] font-bold">{t('wallet.escrowBadge')}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">{t('wallet.pendingBalance')}</p>
              <h2 className="text-4xl font-black text-foreground mt-1">
                {formatCurrency(wallet.pendingBalance, currency, i18n.language)}
              </h2>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed italic border-t border-border pt-4 font-medium">{t('wallet.escrowHint')}</p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border-none shadow-sm bg-card border border-border">
          <CardContent className="p-8 space-y-6 text-foreground">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-foreground">{t('wallet.growthTitle')}</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{t('wallet.totalRevenue')}</span>
                <span className="font-bold text-foreground">{formatCurrency(statsData?.revenue || 0, currency, i18n.language)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{t('wallet.avgClearing')}</span>
                <span className="font-bold text-success">{t('wallet.avgClearingValue')}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border pt-2">
                 <span className="text-xs font-bold text-muted-foreground">{t('wallet.totalBookings')}</span>
                 <span className="font-bold text-foreground">{statsData?.totalBookings || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card id="request-payout" className="border-none shadow-sm bg-card border border-border">
        <CardHeader className="border-b border-border bg-muted/30">
          <CardTitle className="text-xl">{t('wallet.requestTitle')}</CardTitle>
          <CardDescription className="text-xs font-medium text-muted-foreground">
            {t('wallet.requestSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-2xl border border-success/20 bg-success/10 p-4">
                <p className="text-[10px] uppercase tracking-widest font-bold text-success">{t('wallet.availableToWithdraw')}</p>
                <p className="text-3xl font-black text-success mt-2">
                  {formatCurrency(availableBalance, currency, i18n.language)}
                </p>
                <p className="text-[10px] text-success/80 mt-2">
                  {t('wallet.processingHint')}
                </p>
              </div>
              {!hasBankDetails && (
                <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4 text-[11px] font-semibold text-warning">
                  {t('wallet.missingBankHint')}
                </div>
              )}
              <Link href="/dashboard/settings" className="inline-flex">
                <Button variant="outline" size="sm">
                  {t('wallet.updateBankDetails')}
                </Button>
              </Link>
            </div>

            <div className="lg:col-span-2 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('wallet.payoutAmountLabel', { currency })}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={availableBalance}
                    value={payoutAmount}
                    onChange={(event) => setPayoutAmount(event.target.value)}
                    className="h-12 font-semibold"
                    placeholder="0"
                  />
                  <p className="text-[10px] text-muted-foreground">{t('wallet.availableBalanceLine', { amount: formatCurrency(availableBalance, currency, i18n.language) })}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('wallet.bankDetailsForPayout')}</Label>
                  <Textarea
                    value={effectiveBankDetails}
                    onChange={(event) => setBankDetails(event.target.value)}
                    placeholder={t('wallet.bankDetailsPlaceholder')}
                    className="min-h-[120px] text-xs font-medium"
                  />
                  <p className="text-[10px] text-muted-foreground">{t('wallet.bankDetailsNote')}</p>
                </div>
              </div>

              {payoutError && (
                <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-semibold text-danger">
                  {payoutError}
                </div>
              )}
              {payoutSuccess && (
                <div className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-xs font-semibold text-success">
                  {payoutSuccess}
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  {t('wallet.manualReviewRequired')}
                </div>
                <Button
                  onClick={handleRequestPayout}
                  disabled={payoutMutation.isPending || !payoutAmount || availableBalance <= 0}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 h-11"
                >
                  {payoutMutation.isPending ? t('wallet.submitting') : t('wallet.requestAction')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card className="border-none shadow-sm bg-card border border-border overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-xl">{t('wallet.historyTitle')}</CardTitle>
              <CardDescription className="text-muted-foreground text-xs font-medium">{t('wallet.historySubtitle')}</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm">{t('wallet.exportCsv')}</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-start text-muted-foreground">
              <thead className="text-[10px] text-muted-foreground uppercase bg-muted/50 border-b border-border font-bold tracking-widest">
                <tr>
                  <th className="px-6 py-4">{t('wallet.colReference')}</th>
                  <th className="px-6 py-4">{t('wallet.colAmount')}</th>
                  <th className="px-6 py-4">{t('wallet.colStatus')}</th>
                  <th className="px-6 py-4">{t('wallet.colDate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {statsLoading || payoutsLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">{t('wallet.loading')}</td>
                  </tr>
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">{t('wallet.noHistory')}</td>
                  </tr>
                ) : payouts.map((payout) => {
                  const statusMeta = getPayoutStatusMeta(payout.status);
                  return (
                  <tr key={payout.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-5 font-bold text-primary text-xs">
                      #{payout.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-5 font-black text-foreground text-lg">
                      {formatCurrency(payout.amount, currency, i18n.language)}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide flex items-center gap-1.5",
                          statusMeta.className,
                        )}>
                          {payout.status === PayoutStatus.Paid && <CheckCircle2 className="h-3 w-3" />}
                          {payout.status === PayoutStatus.Pending && <Clock className="h-3 w-3" />}
                          {payout.status === PayoutStatus.Rejected && <AlertCircle className="h-3 w-3" />}
                          {getPayoutStatusLabel(payout.status)}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {statusMeta.description}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-muted-foreground">
                      {(payout.processedAt || payout.requestedAt)
                        ? formatLocalDate(payout.processedAt || payout.requestedAt, i18n.language, { dateStyle: 'medium' })
                        : t('wallet.na')}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
          <Pagination
            pagination={payoutsPagination}
            onPageChange={setCurrentPage}
            className="border-t border-border px-6 py-4"
          />
        </CardContent>
      </Card>

      {/* Help Section */}
      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-primary shrink-0 mt-1" />
        <div className="text-sm">
          <h4 className="font-bold text-primary">{t('wallet.howTitle')}</h4>
          <p className="text-primary/80 mt-1 leading-relaxed font-medium">
            {t('wallet.howBody')}
          </p>
        </div>
      </div>
    </div>
  );
}
