'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Pagination } from '@ouiboo/ui';
import { History, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@ouiboo/ui/utils';
import { formatCurrency, formatLocalDate } from '@ouiboo/utils';
import type { PaginationMeta } from '@ouiboo/utils';
import { PayoutStatus, type PayoutDetails } from '@ouiboo/types';
import { usePayoutStatusMeta } from './usePayoutStatusMeta';

type PayoutHistoryProps = {
  payouts: PayoutDetails[];
  pagination: PaginationMeta | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  currency: string;
  language: string;
};

export function PayoutHistory({
  payouts,
  pagination,
  currentPage,
  onPageChange,
  isLoading,
  currency,
  language,
}: PayoutHistoryProps) {
  const { t } = useTranslation();
  const { getPayoutStatusMeta, getPayoutStatusLabel } = usePayoutStatusMeta();

  return (
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
              {isLoading ? (
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
                      {formatCurrency(payout.amount, currency, language)}
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
                        ? formatLocalDate(payout.processedAt || payout.requestedAt, language, { dateStyle: 'medium' })
                        : t('wallet.na')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          pagination={pagination}
          onPageChange={onPageChange}
          className="border-t border-border px-6 py-4"
        />
      </CardContent>
    </Card>
  );
}
