'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Pagination, TableBodySkeleton } from '@ouiboo/ui';
import { History, CheckCircle2, Clock, AlertCircle, Undo2 } from 'lucide-react';
import { cn } from '@ouiboo/ui/utils';
import { formatCurrency, formatLocalDate } from '@ouiboo/utils';
import type { PaginationMeta } from '@ouiboo/utils';

export type AgencyPaymentListItem = {
  id: string;
  bookingId: string;
  amount: string;
  currency: string;
  method: 'MANUAL' | 'GATEWAY';
  provider?: string | null;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'FAILED' | 'REFUNDED';
  custodian: 'AGENCY' | 'AGENCY_PSP';
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  booking?: {
    id: string;
    guestsCount: number;
    traveler?: { name?: string | null; email?: string | null } | null;
    session?: {
      startDate: string;
      template?: { title: string } | null;
    } | null;
  } | null;
};

type PaymentsActivityListProps = {
  payments: AgencyPaymentListItem[];
  pagination: PaginationMeta | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  currency: string;
  language: string;
};

const STATUS_META: Record<AgencyPaymentListItem['status'], { className: string; Icon: typeof Clock }> = {
  VERIFIED: { className: 'bg-success/10 text-success shadow-sm', Icon: CheckCircle2 },
  PENDING_VERIFICATION: { className: 'bg-warning/10 text-warning shadow-sm', Icon: Clock },
  REJECTED: { className: 'bg-danger/10 text-danger shadow-sm', Icon: AlertCircle },
  FAILED: { className: 'bg-danger/10 text-danger shadow-sm', Icon: AlertCircle },
  REFUNDED: { className: 'bg-primary/10 text-primary shadow-sm', Icon: Undo2 },
};

export function PaymentsActivityList({
  payments,
  pagination,
  currentPage,
  onPageChange,
  isLoading,
  currency,
  language,
}: PaymentsActivityListProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-none shadow-sm bg-card border border-border overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-xl">{t('payments.historyTitle')}</CardTitle>
            <CardDescription className="text-muted-foreground text-xs font-medium">{t('payments.historySubtitle')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm text-start text-muted-foreground" aria-busy={isLoading || undefined}>
            <thead className="text-[10px] text-muted-foreground uppercase bg-muted/50 border-b border-border font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">{t('payments.colTrip')}</th>
                <th className="px-6 py-4">{t('payments.colTraveler')}</th>
                <th className="px-6 py-4">{t('payments.colAmount')}</th>
                <th className="px-6 py-4">{t('payments.colMethod')}</th>
                <th className="px-6 py-4">{t('payments.colStatus')}</th>
                <th className="px-6 py-4">{t('payments.colDate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableBodySkeleton rows={5} columns={6} />
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">{t('payments.noHistory')}</td>
                </tr>
              ) : payments.map((payment) => {
                const meta = STATUS_META[payment.status];
                const StatusIcon = meta.Icon;
                return (
                  <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-bold text-foreground text-sm">{payment.booking?.session?.template?.title || t('payments.na')}</p>
                      <p className="text-[10px] font-medium text-muted-foreground">#{payment.bookingId.slice(-8).toUpperCase()}</p>
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-muted-foreground">
                      {payment.booking?.traveler?.name || payment.booking?.traveler?.email || t('payments.na')}
                    </td>
                    <td className="px-6 py-5 font-black text-foreground text-lg">
                      {formatCurrency(Number(payment.amount), payment.currency || currency, language)}
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-muted-foreground">
                      {payment.method === 'GATEWAY'
                        ? (payment.provider || t('payments.methodGateway'))
                        : t('payments.methodManual')}
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide inline-flex items-center gap-1.5',
                        meta.className,
                      )}>
                        <StatusIcon className="h-3 w-3" />
                        {t(`payments.status.${payment.status}`)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-muted-foreground">
                      {formatLocalDate(payment.verifiedAt || payment.updatedAt || payment.createdAt, language, { dateStyle: 'medium' })}
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
