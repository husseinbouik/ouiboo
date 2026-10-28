'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toPaginatedList } from '@ouiboo/utils';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Pagination, CardListSkeleton } from '@ouiboo/ui';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { RefundEvidenceForm, RefundEvidenceList, type RefundEvidenceRow } from '@/components/RefundEvidenceForm';
import { SupportBlock } from '@/components/SupportBlock';

/**
 * #370: agency refund cases. Refunds are paid by the agency (which
 * received the traveller's money directly) — OuiBoo tracks the case and
 * its SLA; it never holds or pays the refund itself (plan §42).
 */
interface AgencyRefundCase {
  id: string;
  bookingId: string;
  status: string;
  reason: string;
  requestedAmount: string;
  approvedAmount: string | null;
  currency: string;
  requestedAt: string;
  refundDueAt: string | null;
  initiatedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  completionTier?: string | null;
  evidence?: RefundEvidenceRow[];
  traveler?: { name: string | null; email: string } | null;
  booking?: { session?: { template?: { title?: string | null } | null } | null } | null;
}

/** Mirrors the API: evidence can only be attached while a case is open. */
const EVIDENCE_OPEN_STATUSES = new Set([
  'REFUND_REQUESTED',
  'ELIGIBILITY_REVIEW',
  'REFUND_APPROVED',
  'AGENCY_ACTION_REQUIRED',
  'REFUND_INITIATED',
  'REFUND_FAILED',
  'REFUND_OVERDUE',
]);

const PAGE_LIMIT = 10;

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  REFUND_REQUESTED: 'secondary',
  ELIGIBILITY_REVIEW: 'secondary',
  REFUND_APPROVED: 'default',
  AGENCY_ACTION_REQUIRED: 'destructive',
  REFUND_INITIATED: 'default',
  REFUND_COMPLETED: 'outline',
  REFUND_REJECTED: 'outline',
  REFUND_FAILED: 'destructive',
  REFUND_OVERDUE: 'destructive',
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

export default function RefundsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState<Record<string, string>>({});

  const { data: actionCount } = useQuery<{ count: number }>({
    queryKey: ['agency-refunds-action-count'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/refunds/action-required-count');
      return response.data;
    },
  });

  const { data: rawCases, isLoading } = useQuery<unknown>({
    queryKey: ['agency-refunds', currentPage],
    queryFn: async () => {
      const response = await apiClient.get('/agency/refunds', {
        params: { page: currentPage, limit: PAGE_LIMIT },
      });
      return response.data;
    },
    placeholderData: (prev: unknown) => prev,
  });
  const { data: cases = [], pagination } = toPaginatedList<AgencyRefundCase>(rawCases);

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: RefundAction }) => {
      const body = action === 'fail' ? { failureReason: failReason[id] || 'Refund transfer failed' } : {};
      await apiClient.post(`/agency/refunds/${id}/${action}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-refunds'] });
      queryClient.invalidateQueries({ queryKey: ['agency-refunds-action-count'] });
      setBusyId(null);
    },
    onError: () => setBusyId(null),
  });

  const runAction = (id: string, action: RefundAction) => {
    setBusyId(id);
    actionMutation.mutate({ id, action });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('refunds.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('refunds.subtitle')}</p>
      </div>

      {/* Session #3 P0-9 (#556): stuck case? The support route lives here too. */}
      <SupportBlock />

      {!!actionCount?.count && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-4">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-foreground">
            {t('refunds.actionRequiredBanner', { count: actionCount.count })}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('refunds.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div role="status" aria-label={t('common.loading')}>
              <CardListSkeleton rows={3} />
              <span className="sr-only">{t('common.loading')}</span>
            </div>
          ) : cases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t('refunds.empty')}</p>
          ) : (
            cases.map((refundCase) => {
              const actions = actionsFor(refundCase.status);
              const tripTitle = refundCase.booking?.session?.template?.title;
              return (
                <div
                  key={refundCase.id}
                  className="rounded-2xl border border-border/60 px-5 py-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {tripTitle || t('refunds.bookingFallback')} ·{' '}
                        {refundCase.approvedAmount ?? refundCase.requestedAmount}{' '}
                        {refundCase.currency}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {refundCase.traveler?.name || refundCase.traveler?.email || ''} ·{' '}
                        {t(`refunds.reason.${refundCase.reason}`, { defaultValue: refundCase.reason })}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[refundCase.status] ?? 'secondary'}>
                      {t(`refunds.status.${refundCase.status}`, {
                        defaultValue: refundCase.status.replaceAll('_', ' '),
                      })}
                    </Badge>
                  </div>

                  {refundCase.refundDueAt && refundCase.status !== 'REFUND_COMPLETED' && (
                    <p className="text-xs font-semibold text-muted-foreground">
                      {t('refunds.dueBy', {
                        date: new Date(refundCase.refundDueAt).toLocaleDateString(),
                      })}
                    </p>
                  )}
                  {refundCase.failureReason && (
                    <p className="text-xs text-destructive">
                      {t('refunds.failureReason')}: {refundCase.failureReason}
                    </p>
                  )}

                  <RefundEvidenceList
                    evidence={refundCase.evidence}
                    currency={refundCase.currency}
                    status={refundCase.status}
                    completionTier={refundCase.completionTier}
                  />

                  {EVIDENCE_OPEN_STATUSES.has(refundCase.status) && (
                    <RefundEvidenceForm
                      caseId={refundCase.id}
                      expectedAmount={refundCase.approvedAmount ?? refundCase.requestedAmount}
                      currency={refundCase.currency}
                      onSubmitted={() => {
                        void queryClient.invalidateQueries({ queryKey: ['agency-refunds'] });
                      }}
                    />
                  )}

                  {actions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {actions.map((action) => (
                        <Button
                          key={action}
                          size="sm"
                          variant={action === 'reject' || action === 'fail' ? 'outline' : 'default'}
                          disabled={busyId === refundCase.id}
                          onClick={() => runAction(refundCase.id, action)}
                        >
                          {busyId === refundCase.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            t(`refunds.actions.${action}`)
                          )}
                        </Button>
                      ))}
                      {actions.includes('fail') && (
                        <input
                          type="text"
                          value={failReason[refundCase.id] ?? ''}
                          onChange={(e) =>
                            setFailReason((prev) => ({ ...prev, [refundCase.id]: e.target.value }))
                          }
                          placeholder={t('refunds.failReasonPlaceholder')}
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-56"
                          aria-label={t('refunds.failReasonPlaceholder')}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <Pagination pagination={pagination} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{t('refunds.honestNote')}</p>
    </div>
  );
}
