'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { Badge, Button, Card, Pagination } from '@ouiboo/ui';
import type { PaginationMeta } from '@ouiboo/utils';
import { apiClient } from '@/lib/api-client';
import type { AdminRefundCase } from './types';
import { formatDateTime } from './formatters';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type RefundsTabProps = {
  t: TFn;
  cases: AdminRefundCase[];
  pagination: PaginationMeta | null;
  onPageChange: (page: number) => void;
  paginationLabels: {
    showing: string;
    of: string;
    pagination: string;
    previousPage: string;
    nextPage: string;
    goToPage: (page: number) => string;
  };
};

type RefundAction = 'review' | 'approve' | 'reject' | 'initiate' | 'complete' | 'fail';

function actionsFor(status: string): RefundAction[] {
  switch (status) {
    case 'REFUND_REQUESTED':
      return ['review', 'approve', 'reject'];
    case 'ELIGIBILITY_REVIEW':
      return ['approve', 'reject'];
    case 'REFUND_APPROVED':
    case 'AGENCY_ACTION_REQUIRED':
    case 'REFUND_OVERDUE':
      return ['initiate'];
    case 'REFUND_INITIATED':
      return ['complete', 'fail'];
    case 'REFUND_FAILED':
      return ['initiate'];
    default:
      return [];
  }
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success'> = {
  REFUND_REQUESTED: 'secondary',
  ELIGIBILITY_REVIEW: 'secondary',
  REFUND_APPROVED: 'default',
  AGENCY_ACTION_REQUIRED: 'destructive',
  REFUND_INITIATED: 'default',
  REFUND_COMPLETED: 'success',
  REFUND_REJECTED: 'outline',
  REFUND_FAILED: 'destructive',
  REFUND_OVERDUE: 'destructive',
};

/**
 * #370: admin oversight of refund cases across agencies. Refunds are
 * paid by agencies from their own merchant accounts — this tab tracks
 * the lifecycle and SLA; overdue cases restrict the agency's new
 * bookings (existing bookings are never affected).
 */
export default function RefundsTab({ t, cases, pagination, onPageChange, paginationLabels }: RefundsTabProps) {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: RefundAction }) => {
      const body = action === 'fail' ? { failureReason: 'Marked failed by admin' } : {};
      await apiClient.post(`/admin/refunds/${id}/${action}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      setBusyId(null);
    },
    onError: () => setBusyId(null),
  });

  if (cases.length === 0) {
    return (
      <Card className="p-10 text-center space-y-3">
        <RotateCcw className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="font-semibold">{t('dashboard.refunds.empty')}</p>
        <p className="text-sm text-muted-foreground">{t('dashboard.refunds.emptyHint')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {cases.map((refundCase) => {
        const actions = actionsFor(refundCase.status);
        const overdue = refundCase.status === 'REFUND_OVERDUE';
        return (
          <Card
            key={refundCase.id}
            className={`p-5 space-y-3 ${overdue ? 'border-destructive/60 bg-destructive/5' : ''}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {refundCase.booking?.session?.template?.title || refundCase.bookingId} ·{' '}
                  {refundCase.approvedAmount ?? refundCase.requestedAmount} {refundCase.currency}
                </p>
                <p className="text-xs text-muted-foreground">
                  {refundCase.agency?.companyName || refundCase.agencyId} ·{' '}
                  {refundCase.traveler?.name || refundCase.traveler?.email || refundCase.travelerId} ·{' '}
                  {t(`dashboard.refunds.reason.${refundCase.reason}`, { defaultValue: refundCase.reason })}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[refundCase.status] ?? 'secondary'}>
                {t(`dashboard.refunds.status.${refundCase.status}`, {
                  defaultValue: refundCase.status.replaceAll('_', ' '),
                })}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>
                {t('dashboard.refunds.requestedAt')}: {formatDateTime(refundCase.requestedAt, t)}
              </span>
              {refundCase.refundDueAt && (
                <span className={overdue ? 'font-bold text-destructive' : ''}>
                  {t('dashboard.refunds.dueBy')}: {formatDateTime(refundCase.refundDueAt, t)}
                </span>
              )}
              {refundCase.failureReason && (
                <span className="text-destructive">
                  {t('dashboard.refunds.failureReason')}: {refundCase.failureReason}
                </span>
              )}
            </div>
            {actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <Button
                    key={action}
                    size="sm"
                    variant={action === 'reject' || action === 'fail' ? 'outline' : 'default'}
                    disabled={busyId === refundCase.id}
                    onClick={() => {
                      setBusyId(refundCase.id);
                      actionMutation.mutate({ id: refundCase.id, action });
                    }}
                  >
                    {t(`dashboard.refunds.actions.${action}`)}
                  </Button>
                ))}
              </div>
            )}
          </Card>
        );
      })}
      <Pagination pagination={pagination} onPageChange={onPageChange} labels={paginationLabels} />
    </div>
  );
}
