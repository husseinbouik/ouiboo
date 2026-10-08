'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

type UsePayoutFormOptions = {
  availableBalance: number;
  hasBankDetails: boolean;
  effectiveBankDetails: string;
};

export function usePayoutForm({
  availableBalance,
  hasBankDetails,
  effectiveBankDetails,
}: UsePayoutFormOptions) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);

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

  return {
    payoutAmount,
    setPayoutAmount,
    payoutError,
    payoutSuccess,
    payoutMutation,
    handleRequestPayout,
  };
}
