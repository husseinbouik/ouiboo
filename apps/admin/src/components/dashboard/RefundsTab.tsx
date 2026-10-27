'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { RotateCcw } from 'lucide-react';
import { Badge, Button, Card, Pagination } from '@ouiboo/ui';
import type { PaginationMeta } from '@ouiboo/utils';
import { apiClient } from '@/lib/api-client';
import type { AdminRefundCase, ApiErrorResponse } from './types';
import { formatDateTime } from './formatters';
import { getErrorMessage } from './dashboard-utils';
import AdminActionModal from './AdminActionModal';

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
  /** #416C: audit-queue view toggle (completed + auditRequired + unaudited). */
  auditQueue?: boolean;
  onAuditQueueChange?: (value: boolean) => void;
  /** #559: urgency pre-filter applied from the summary cards (deep link). */
  urgencyFilter?: 'overdue' | 'due48' | null;
  onClearUrgencyFilter?: () => void;
};

type RefundAction = 'review' | 'approve' | 'reject' | 'initiate' | 'complete' | 'fail';

/** #423: admin-only repairs for stuck cases — the only exits from the
 * terminal states, and the only way to fix a wrong amount or payment
 * link. Each repair is audit-logged with a mandatory reason. */
type RefundRepairAction = 'reopen' | 'correct-amount' | 'relink-payment';

function repairActionsFor(status: string): RefundRepairAction[] {
  switch (status) {
    case 'REFUND_COMPLETED':
      return ['reopen', 'correct-amount', 'relink-payment'];
    case 'REFUND_REJECTED':
      return ['reopen', 'relink-payment'];
    case 'REFUND_REQUESTED':
    case 'ELIGIBILITY_REVIEW':
      return ['relink-payment'];
    default:
      return ['correct-amount', 'relink-payment'];
  }
}

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
export default function RefundsTab({ t, cases, pagination, onPageChange, paginationLabels, auditQueue = false, onAuditQueueChange, urgencyFilter = null, onClearUrgencyFilter }: RefundsTabProps) {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<AdminRefundCase | null>(null);
  const [reviewReference, setReviewReference] = useState('');
  const [reviewDocument, setReviewDocument] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [repairTarget, setRepairTarget] = useState<AdminRefundCase | null>(null);
  const [repairAction, setRepairAction] = useState<RefundRepairAction>('reopen');
  const [repairAmount, setRepairAmount] = useState('');
  const [repairPaymentId, setRepairPaymentId] = useState('');
  const [repairReference, setRepairReference] = useState('');
  const [repairError, setRepairError] = useState<string | null>(null);
  const [repairFeedback, setRepairFeedback] = useState<string | null>(null);

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

  // #416C: recording the audit review for a flagged completion. The
  // stamp is a review obligation only — it never blocks completion.
  const auditMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/admin/refunds/${id}/audit`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['refunds'] });
      setBusyId(null);
    },
    onError: () => setBusyId(null),
  });

  // B8 (Council Session #2): record an admin review as tier-5 evidence
  // through its own endpoint — a separate step from completion. The
  // modal enforces the written reason; the document/reference pair is
  // validated here and again server-side (a reason alone is not
  // evidence). Completion afterwards consumes the recorded row.
  const adminReviewMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const body: Record<string, unknown> = { reason };
      if (reviewReference.trim()) {
        body.reference = reviewReference.trim();
      }
      if (reviewDocument.trim()) {
        body.proofUrl = reviewDocument.trim();
      }
      await apiClient.post(`/admin/refunds/${id}/admin-review`, body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['refunds'] });
      setReviewTarget(null);
      setReviewError(null);
      setReviewFeedback(t('dashboard.groups.success'));
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      setReviewError(getErrorMessage(error, t('dashboard.interventions.failed')));
    },
  });

  const openAdminReview = (refundCase: AdminRefundCase) => {
    setReviewError(null);
    setReviewFeedback(null);
    setReviewReference('');
    setReviewDocument('');
    setReviewTarget(refundCase);
  };

  const submitAdminReview = (reason: string) => {
    if (!reviewTarget) {
      return;
    }
    if (!reviewReference.trim() && !reviewDocument.trim()) {
      setReviewError(t('dashboard.refunds.adminReview.evidenceRequired'));
      return;
    }
    adminReviewMutation.mutate({ id: reviewTarget.id, reason });
  };

  const repairMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: RefundRepairAction; reason: string }) => {
      const body: Record<string, unknown> = { action, reason };
      if (action === 'correct-amount') {
        body.approvedAmount = Number(repairAmount);
      }
      if (action === 'relink-payment') {
        if (repairPaymentId.trim()) {
          body.originalPaymentId = repairPaymentId.trim();
        }
        if (repairReference.trim()) {
          body.externalPaymentReference = repairReference.trim();
        }
      }
      await apiClient.post(`/admin/refunds/${id}/repair`, body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['refunds'] });
      setRepairTarget(null);
      setRepairError(null);
      setRepairFeedback(t('dashboard.groups.success'));
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      setRepairError(getErrorMessage(error, t('dashboard.interventions.failed')));
    },
  });

  const openRepair = (refundCase: AdminRefundCase) => {
    setRepairError(null);
    setRepairFeedback(null);
    setRepairAmount(refundCase.approvedAmount ?? '');
    setRepairPaymentId(refundCase.originalPaymentId ?? '');
    setRepairReference(refundCase.externalPaymentReference ?? '');
    setRepairAction(repairActionsFor(refundCase.status)[0]);
    setRepairTarget(refundCase);
  };

  // #559: visible pre-filter chip when arriving from a summary card.
  const urgencyBanner = urgencyFilter ? (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-2 text-sm">
      <span className="font-semibold text-foreground">
        {t(urgencyFilter === 'overdue' ? 'dashboard.refunds.urgency.overdueFilter' : 'dashboard.refunds.urgency.due48Filter')}
      </span>
      {onClearUrgencyFilter && (
        <Button size="sm" variant="outline" onClick={onClearUrgencyFilter}>
          {t('dashboard.refunds.urgency.clearFilter')}
        </Button>
      )}
    </div>
  ) : null;

  const viewToggle = onAuditQueueChange ? (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={auditQueue ? 'outline' : 'default'}
          onClick={() => onAuditQueueChange(false)}
        >
          {t('dashboard.refunds.audit.all')}
        </Button>
        <Button
          size="sm"
          variant={auditQueue ? 'default' : 'outline'}
          onClick={() => onAuditQueueChange(true)}
        >
          {t('dashboard.refunds.audit.queue')}
        </Button>
      </div>
      {auditQueue && (
        <p className="text-xs text-muted-foreground">{t('dashboard.refunds.audit.queueHint')}</p>
      )}
    </div>
  ) : null;

  if (cases.length === 0) {
    return (
      <div className="space-y-4">
        {urgencyBanner}
        {viewToggle}
        <Card className="p-10 text-center space-y-3">
          <RotateCcw className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-semibold">
            {t(auditQueue ? 'dashboard.refunds.audit.queueEmpty' : 'dashboard.refunds.empty')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t(auditQueue ? 'dashboard.refunds.audit.queueEmptyHint' : 'dashboard.refunds.emptyHint')}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {urgencyBanner}
      {viewToggle}
      {repairFeedback && <div className="text-sm font-medium text-success">{repairFeedback}</div>}
      {reviewFeedback && <div className="text-sm font-medium text-success">{reviewFeedback}</div>}
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
            {refundCase.status === 'REFUND_COMPLETED' && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
                {refundCase.completionTier && (
                  <span>
                    {t('dashboard.refunds.tierLabel')}:{' '}
                    <span className="font-semibold text-foreground">
                      {t(`dashboard.refunds.tier.${refundCase.completionTier}`, {
                        defaultValue: refundCase.completionTier.replaceAll('_', ' '),
                      })}
                    </span>
                  </span>
                )}
                <span>
                  {refundCase.evidence?.length
                    ? t('dashboard.refunds.evidenceSummary', { count: refundCase.evidence.length })
                    : t('dashboard.refunds.noEvidence')}
                </span>
                {refundCase.auditedAt ? (
                  <span>
                    {t('dashboard.refunds.audit.audited', {
                      date: formatDateTime(refundCase.auditedAt, t),
                    })}
                  </span>
                ) : refundCase.auditRequired ? (
                  <Badge variant="destructive">{t('dashboard.refunds.audit.required')}</Badge>
                ) : null}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {refundCase.status === 'REFUND_COMPLETED' && refundCase.auditRequired && !refundCase.auditedAt && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === refundCase.id}
                  onClick={() => {
                    setBusyId(refundCase.id);
                    auditMutation.mutate(refundCase.id);
                  }}
                >
                  {t('dashboard.refunds.audit.markAudited')}
                </Button>
              )}
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
              {refundCase.status === 'REFUND_INITIATED' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={adminReviewMutation.isPending}
                  onClick={() => openAdminReview(refundCase)}
                >
                  {t('dashboard.refunds.actions.adminReview')}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={repairMutation.isPending}
                onClick={() => openRepair(refundCase)}
              >
                {t('dashboard.interventions.repair')}
              </Button>
            </div>
          </Card>
        );
      })}
      <Pagination pagination={pagination} onPageChange={onPageChange} labels={paginationLabels} />

      {repairTarget && (
        <AdminActionModal
          t={t}
          title={t('dashboard.interventions.refundRepair.title')}
          description={t('dashboard.interventions.refundRepair.description')}
          confirmLabel={t('dashboard.interventions.repair')}
          pending={repairMutation.isPending}
          error={repairError}
          onClose={() => setRepairTarget(null)}
          onSubmit={(reason) => repairMutation.mutate({ id: repairTarget.id, action: repairAction, reason })}
        >
          <div className="space-y-3">
            <div className="space-y-2">
              <label
                htmlFor="refund-repair-action"
                className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {t('dashboard.interventions.repairActionLabel')}
              </label>
              <select
                id="refund-repair-action"
                value={repairAction}
                onChange={(event) => setRepairAction(event.target.value as RefundRepairAction)}
                className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-orange/20"
              >
                {repairActionsFor(repairTarget.status).map((action) => (
                  <option key={action} value={action}>
                    {t(`dashboard.interventions.refundRepair.${action}`)}
                  </option>
                ))}
              </select>
            </div>
            {repairAction === 'correct-amount' && (
              <div className="space-y-2">
                <label
                  htmlFor="refund-repair-amount"
                  className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {t('dashboard.interventions.refundRepair.amountLabel')} ({repairTarget.currency})
                </label>
                <input
                  id="refund-repair-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={repairAmount}
                  onChange={(event) => setRepairAmount(event.target.value)}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-orange/20"
                />
              </div>
            )}
            {repairAction === 'relink-payment' && (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="refund-repair-payment-id"
                    className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {t('dashboard.interventions.refundRepair.paymentIdLabel')}
                  </label>
                  <input
                    id="refund-repair-payment-id"
                    type="text"
                    value={repairPaymentId}
                    onChange={(event) => setRepairPaymentId(event.target.value)}
                    className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-orange/20"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.interventions.refundRepair.paymentIdHint')}
                  </p>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="refund-repair-reference"
                    className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {t('dashboard.interventions.refundRepair.referenceLabel')}
                  </label>
                  <input
                    id="refund-repair-reference"
                    type="text"
                    value={repairReference}
                    onChange={(event) => setRepairReference(event.target.value)}
                    className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-orange/20"
                  />
                </div>
              </>
            )}
          </div>
        </AdminActionModal>
      )}

      {reviewTarget && (
        <AdminActionModal
          t={t}
          title={t('dashboard.refunds.adminReview.title')}
          description={t('dashboard.refunds.adminReview.description')}
          confirmLabel={t('dashboard.refunds.actions.adminReview')}
          pending={adminReviewMutation.isPending}
          error={reviewError}
          onClose={() => setReviewTarget(null)}
          onSubmit={submitAdminReview}
        >
          <div className="space-y-3">
            <div className="space-y-2">
              <label
                htmlFor="refund-admin-review-reference"
                className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {t('dashboard.refunds.adminReview.referenceLabel')}
              </label>
              <input
                id="refund-admin-review-reference"
                type="text"
                value={reviewReference}
                onChange={(event) => setReviewReference(event.target.value)}
                className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-orange/20"
              />
              <p className="text-xs text-muted-foreground">
                {t('dashboard.refunds.adminReview.referenceHint')}
              </p>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="refund-admin-review-document"
                className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {t('dashboard.refunds.adminReview.documentLabel')}
              </label>
              <input
                id="refund-admin-review-document"
                type="text"
                value={reviewDocument}
                onChange={(event) => setReviewDocument(event.target.value)}
                className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-orange/20"
              />
              <p className="text-xs text-muted-foreground">
                {t('dashboard.refunds.adminReview.documentHint')}
              </p>
            </div>
          </div>
        </AdminActionModal>
      )}
    </div>
  );
}
