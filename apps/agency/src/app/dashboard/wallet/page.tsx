'use client';

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { type PayoutDetails } from '@ouiboo/types';
import { toPaginatedList } from '@ouiboo/utils';
import { useAuth } from '@/components/AuthContext';
import { WalletBalanceCards } from '@/components/wallet/WalletBalanceCards';
import { PayoutRequest } from '@/components/wallet/PayoutRequest';
import { PayoutHistory } from '@/components/wallet/PayoutHistory';
import { WalletHelp } from '@/components/wallet/WalletHelp';
import { usePayoutForm } from '@/components/wallet/usePayoutForm';

export default function WalletPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [bankDetails, setBankDetails] = useState('');
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

  const {
    payoutAmount,
    setPayoutAmount,
    payoutError,
    payoutSuccess,
    payoutMutation,
    handleRequestPayout,
  } = usePayoutForm({ availableBalance, hasBankDetails, effectiveBankDetails });

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

      <WalletBalanceCards
        availableBalance={availableBalance}
        pendingBalance={Number(wallet.pendingBalance || 0)}
        currency={currency}
        revenue={statsData?.revenue || 0}
        totalBookings={statsData?.totalBookings || 0}
        language={i18n.language}
        onRequestPayout={handleScrollToRequest}
      />

      <PayoutRequest
        availableBalance={availableBalance}
        currency={currency}
        language={i18n.language}
        hasBankDetails={hasBankDetails}
        effectiveBankDetails={effectiveBankDetails}
        onBankDetailsChange={setBankDetails}
        payoutAmount={payoutAmount}
        onPayoutAmountChange={setPayoutAmount}
        payoutError={payoutError}
        payoutSuccess={payoutSuccess}
        isSubmitting={payoutMutation.isPending}
        canSubmit={Boolean(payoutAmount) && availableBalance > 0}
        onSubmit={handleRequestPayout}
      />

      <PayoutHistory
        payouts={payouts}
        pagination={payoutsPagination}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isLoading={statsLoading || payoutsLoading}
        currency={currency}
        language={i18n.language}
      />

      <WalletHelp />
    </div>
  );
}
