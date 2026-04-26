'use client';

import React, { useMemo, useState } from 'react';
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
  Textarea
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
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';
import { useAuth } from '@/components/AuthContext';

const getPayoutStatusMeta = (status: PayoutStatus) => {
  if (status === PayoutStatus.Paid) {
    return {
      className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 shadow-sm',
      description: 'Transferred to your bank account',
    };
  }

  if (status === PayoutStatus.Rejected) {
    return {
      className: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 shadow-sm',
      description: 'Rejected and returned to your available balance',
    };
  }

  if (status === PayoutStatus.Approved) {
    return {
      className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 shadow-sm',
      description: 'Approved and waiting for transfer',
    };
  }

  return {
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 shadow-sm',
    description: 'Pending manual review',
  };
};

export default function WalletPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [payoutAmount, setPayoutAmount] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['agency-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/stats');
      return response.data;
    }
  });

  const { data: payouts = [], isLoading: payoutsLoading } = useQuery<PayoutDetails[]>({
    queryKey: ['agency-payouts'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/payouts');
      return response.data;
    }
  });

  const wallet = statsData?.wallet || { availableBalance: 0, pendingBalance: 0 };
  const availableBalance = Number(wallet.availableBalance || 0);
  const initialBankDetails = useMemo(
    () => user?.agencyProfile?.bankDetails ?? '',
    [user?.agencyProfile?.bankDetails],
  );
  const effectiveBankDetails = bankDetails || initialBankDetails;
  const hasBankDetails = effectiveBankDetails.trim().length > 0;

  const payoutMutation = useMutation({
    mutationFn: async (payload: { amount: number; bankDetails: string }) => {
      await apiClient.post('/agency/payouts', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-stats'] });
      queryClient.invalidateQueries({ queryKey: ['agency-payouts'] });
      setPayoutAmount('');
      setPayoutError(null);
      setPayoutSuccess('Payout request submitted. Expect confirmation in 1-2 business days.');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      setPayoutSuccess(null);
      setPayoutError(error?.response?.data?.message || 'Unable to request payout.');
    }
  });

  const handleRequestPayout = () => {
    setPayoutError(null);
    setPayoutSuccess(null);

    const amountValue = Number(payoutAmount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setPayoutError('Enter a valid payout amount.');
      return;
    }
    if (amountValue > availableBalance) {
      setPayoutError('Amount exceeds available balance.');
      return;
    }
    if (!hasBankDetails) {
      setPayoutError('Add bank details before requesting a payout.');
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
        <h1 className="text-3xl font-bold text-deep-blue dark:text-gray-100">
           {t('wallet.title', 'Wallet & Payouts')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
           {t('wallet.subtitle', 'Manage your earnings and request payouts.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available Balance */}
        <Card className="border-none shadow-lg bg-deep-blue dark:bg-blue-900 text-white relative overflow-hidden">
          <CardContent className="p-8 space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="bg-white/10 p-2 rounded-lg text-white">
                <WalletIcon className="h-6 w-6" />
              </div>
              <Badge variant="success" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold uppercase text-[10px]">Cleared</Badge>
            </div>
            <div>
              <p className="text-blue-100/80 text-xs font-bold uppercase tracking-wider">Available Balance</p>
              <h2 className="text-4xl font-black mt-1">
                {wallet.availableBalance.toLocaleString()} <span className="text-lg font-normal opacity-60">MAD</span>
              </h2>
            </div>
            <Button
              onClick={handleScrollToRequest}
              className="w-full bg-sunset-orange hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-900/20 font-bold py-6 group transition-all"
            >
              Withdraw Funds <ArrowUpRight className="ml-2 h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Button>
          </CardContent>
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-sunset-orange/10 rounded-full blur-3xl"></div>
        </Card>

        {/* Pending Balance */}
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 border dark:border-slate-800">
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg text-amber-600 dark:text-amber-400">
                <Clock className="h-6 w-6" />
              </div>
              <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/40 uppercase text-[10px] font-bold">In Escrow</Badge>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Pending Balance</p>
              <h2 className="text-4xl font-black text-deep-blue dark:text-blue-400 mt-1">
                {wallet.pendingBalance.toLocaleString()} <span className="text-lg font-normal text-gray-400">MAD</span>
              </h2>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed italic border-t dark:border-slate-800 pt-4 font-medium">This amount is held in escrow until trips are completed and verified by travelers.</p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 border dark:border-slate-800">
          <CardContent className="p-8 space-y-6 text-gray-900 dark:text-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-deep-blue dark:text-gray-200">Growth & Efficiency</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">Total Rev.</span>
                <span className="font-bold text-deep-blue dark:text-gray-200">{statsData?.revenue?.toLocaleString() || 0} MAD</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">Avg. Clearing</span>
                <span className="font-bold text-green-600">~24 Hours</span>
              </div>
              <div className="flex justify-between items-center border-t dark:border-slate-800 pt-2">
                 <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Total Bookings</span>
                 <span className="font-bold text-deep-blue dark:text-gray-200">{statsData?.totalBookings || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card id="request-payout" className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
        <CardHeader className="border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30">
          <CardTitle className="text-xl">{t('wallet.requestTitle', 'Request a payout')}</CardTitle>
          <CardDescription className="text-xs font-medium dark:text-gray-400">
            {t('wallet.requestSubtitle', 'Submit a manual payout request to your registered bank account.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10 p-4">
                <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-700 dark:text-emerald-300">Available to withdraw</p>
                <p className="text-3xl font-black text-emerald-900 dark:text-emerald-200 mt-2">
                  {availableBalance.toLocaleString()} <span className="text-sm font-semibold opacity-70">MAD</span>
                </p>
                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-2">
                  Payouts are typically processed in 1-2 business days.
                </p>
              </div>
              {!hasBankDetails && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 p-4 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  Add your bank details before requesting a payout.
                </div>
              )}
              <Link href="/dashboard/settings" className="inline-flex">
                <Button variant="outline" size="sm" className="dark:border-slate-700 dark:text-gray-300">
                  Update bank details
                </Button>
              </Link>
            </div>

            <div className="lg:col-span-2 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Payout amount (MAD)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={availableBalance}
                    value={payoutAmount}
                    onChange={(event) => setPayoutAmount(event.target.value)}
                    className="h-12 dark:bg-slate-800 dark:border-slate-700 font-semibold"
                    placeholder="0"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Available balance: {availableBalance.toLocaleString()} MAD</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Bank details for this payout</Label>
                  <Textarea
                    value={effectiveBankDetails}
                    onChange={(event) => setBankDetails(event.target.value)}
                    placeholder="Add your RIB and bank name"
                    className="min-h-[120px] dark:bg-slate-800 dark:border-slate-700 text-xs font-medium"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">This will be used for the payout request.</p>
                </div>
              </div>

              {payoutError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                  {payoutError}
                </div>
              )}
              {payoutSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                  {payoutSuccess}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">
                  Manual review required
                </div>
                <Button
                  onClick={handleRequestPayout}
                  disabled={payoutMutation.isPending || !payoutAmount || availableBalance <= 0}
                  className="bg-deep-blue hover:bg-blue-800 text-white font-bold px-6 h-11"
                >
                  {payoutMutation.isPending ? 'Submitting...' : 'Request payout'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-400" />
            <div>
              <CardTitle className="text-xl">Payout History</CardTitle>
              <CardDescription className="dark:text-gray-400 text-xs font-medium">Recent transfers to your registered RIB</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" className="dark:border-slate-700 dark:text-gray-300">Export CSV</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-[10px] text-gray-400 dark:text-gray-500 uppercase bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-800 font-bold tracking-widest">
                <tr>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {statsLoading || payoutsLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">Loading transactions...</td>
                  </tr>
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">No payout history yet.</td>
                  </tr>
                ) : payouts.map((payout) => {
                  const statusMeta = getPayoutStatusMeta(payout.status);
                  return (
                  <tr key={payout.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-5 font-bold text-deep-blue dark:text-blue-400 text-xs">
                      #{payout.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-5 font-black text-gray-900 dark:text-gray-100 text-lg">
                      {payout.amount.toLocaleString()} <span className="text-[10px] font-normal opacity-50">MAD</span>
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
                          {payout.status}
                        </span>
                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                          {statusMeta.description}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-gray-400 dark:text-gray-500">
                      {(payout.processedAt || payout.requestedAt) ? new Date(payout.processedAt || payout.requestedAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl p-6 flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
        <div className="text-sm">
          <h4 className="font-bold text-blue-900 dark:text-blue-300">How do payouts work?</h4>
          <p className="text-blue-700/80 dark:text-blue-400/80 mt-1 leading-relaxed font-medium">
            When a traveler books a trip, the money is held in <strong>Escrow</strong> (Pending Balance). 
            Funds are moved to your <strong>Available Balance</strong> 24 hours after the trip is completed. 
            Once in Available Balance, you can request a withdrawal to your registered RIB. Rejected payouts are restored to your wallet automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
