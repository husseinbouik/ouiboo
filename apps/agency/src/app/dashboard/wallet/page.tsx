'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toPaginatedList } from '@ouiboo/utils';
import { PaymentsOverviewCards } from '@/components/payments/PaymentsOverviewCards';
import { PaymentsActivityList, type AgencyPaymentListItem } from '@/components/payments/PaymentsActivityList';
import { PaymentsHelp } from '@/components/payments/PaymentsHelp';

type PaymentsOverviewResponse = {
  currency: string;
  totalReceived: string;
  totalRefunded: string;
  pendingVerificationCount: number;
  pendingVerificationAmount: string;
};

const PAYMENTS_PAGE_LIMIT = 10;

/**
 * #368: this page used to be "Wallet & Payouts" with a withdrawable OuiBoo
 * balance. Traveller money is paid directly to the agency / its payment
 * provider, so the page now reports recorded payment facts only.
 */
export default function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: overview, isLoading: overviewLoading } = useQuery<PaymentsOverviewResponse>({
    queryKey: ['agency-payments-overview'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/payments/overview');
      return response.data;
    },
  });

  const { data: rawPayments, isLoading: paymentsLoading } = useQuery<unknown>({
    queryKey: ['agency-payments', currentPage],
    queryFn: async () => {
      const response = await apiClient.get('/agency/payments', {
        params: { page: currentPage, limit: PAYMENTS_PAGE_LIMIT },
      });
      return response.data;
    },
    placeholderData: (prev: unknown) => prev,
  });
  const { data: payments = [], pagination: paymentsPagination } =
    toPaginatedList<AgencyPaymentListItem>(rawPayments);

  const currency = overview?.currency || 'MAD';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t('payments.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('payments.subtitle')}
        </p>
      </div>

      <PaymentsOverviewCards
        totalReceived={Number(overview?.totalReceived || 0)}
        totalRefunded={Number(overview?.totalRefunded || 0)}
        pendingVerificationAmount={Number(overview?.pendingVerificationAmount || 0)}
        pendingVerificationCount={overview?.pendingVerificationCount || 0}
        currency={currency}
        language={i18n.language}
      />

      <PaymentsActivityList
        payments={payments}
        pagination={paymentsPagination}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isLoading={overviewLoading || paymentsLoading}
        currency={currency}
        language={i18n.language}
      />

      <PaymentsHelp />
    </div>
  );
}
