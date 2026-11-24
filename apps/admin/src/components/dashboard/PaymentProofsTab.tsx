'use client';

import React from 'react';
import { CreditCard, Eye } from 'lucide-react';
import {
  Button,
  Badge,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ouiboo/ui';
import { VerificationStatus, type VerificationStatusType } from '@ouiboo/types';
import type { PaginationMeta } from '@ouiboo/utils';
import type { AdminPaymentProof, FeedbackState } from './types';
import { canApprovePaymentProof, canRejectPaymentProof } from './formatters';
import { getQueueAge } from './dashboard-utils';
import { getAdminProofBankConfirmationMeta } from '../../app/status-mappers';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type PaymentProofsTabProps = {
  t: TFn;
  proofs: AdminPaymentProof[];
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
  paymentProofFeedback: FeedbackState | null;
  viewingProofId: string | null;
  isVerifying: boolean;
  onViewProof: (bookingId?: string) => void;
  onVerifyPayment: (id: string, status: VerificationStatusType) => void;
};

/**
 * Phase 5 (Design Council 2026-11-24, verdict #21 — Option A, Queue
 * workbench): the queue table (shared @ouiboo/ui Table, replacing the
 * hand-rolled 10px-header table), a per-item queue AGE column, and the
 * decision panel beside the table — the "accepting a proof is not
 * settlement" attestation copy sits with the proof being decided, and
 * the accept/reject actions live in that panel, per the mockup.
 */
export default function PaymentProofsTab({
  t,
  proofs,
  pagination,
  onPageChange,
  paginationLabels,
  paymentProofFeedback,
  viewingProofId,
  isVerifying,
  onViewProof,
  onVerifyPayment,
}: PaymentProofsTabProps) {
  const [selectedProofId, setSelectedProofId] = React.useState<string | null>(null);
  const selectedProof =
    proofs.find((proof) => proof.id === selectedProofId) ?? proofs[0] ?? null;

  const ageLabel = (iso?: string | null) => {
    const age = getQueueAge(iso);
    if (!age) return t('dashboard.labels.na');
    const unitKey =
      age.unit === 'minutes'
        ? 'dashboard.labels.ageMinutes'
        : age.unit === 'hours'
          ? 'dashboard.labels.ageHours'
          : 'dashboard.labels.ageDays';
    return t(unitKey, { count: age.amount });
  };

  const handleReject = (payment: AdminPaymentProof) => {
    const reason = window.prompt(t('dashboard.prompts.paymentProofRejection'));
    if (!reason) {
      return;
    }
    onVerifyPayment(payment.id, VerificationStatus.Rejected);
  };

  const selectedStatus = selectedProof?.booking?.paymentProof?.status;
  const selectedCanApprove = canApprovePaymentProof(selectedStatus);
  const selectedCanReject = canRejectPaymentProof(selectedStatus);

  return (
<div className="space-y-6 animate-in fade-in duration-500">
    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
      <CreditCard className="h-5 w-5 text-sunset-orange" />
      {t('dashboard.sections.proofs')} ({pagination?.total ?? proofs.length})
   </h2>
   {paymentProofFeedback && (
     <div className={`animate-in fade-in slide-in-from-top-1 duration-150 text-sm font-medium ${paymentProofFeedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
       {paymentProofFeedback.message}
     </div>
   )}
   <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px] xl:items-start">
   <div className="bg-card rounded-3xl overflow-hidden shadow-sm border border-border">
      {proofs.length ? (
        <Table>
          <TableHeader>
             <TableRow>
                <TableHead scope="col">{t('dashboard.table.booking')}</TableHead>
                <TableHead scope="col">{t('dashboard.table.traveler')}</TableHead>
                <TableHead scope="col">{t('dashboard.table.amount')}</TableHead>
                <TableHead scope="col">{t('dashboard.table.submitted')}</TableHead>
                <TableHead scope="col">{t('dashboard.table.age')}</TableHead>
                <TableHead scope="col" className="text-end">{t('dashboard.table.action')}</TableHead>
             </TableRow>
          </TableHeader>
          <TableBody>
             {proofs.map((payment) => {
               const proofStatus = payment.booking?.paymentProof?.status;
               // #422: read-only bank-confirmation state — accepting the
               // image is not settlement, and there is no admin
               // bank-confirm action (agency-only, decision D3).
               const bankMeta = getAdminProofBankConfirmationMeta(proofStatus, t);
               const bankConfirmation = payment.bankConfirmation;
               const isSelected = selectedProof?.id === payment.id;
               return (
                  <TableRow
                    key={payment.id}
                    data-state={isSelected ? 'selected' : undefined}
                    onClick={() => setSelectedProofId(payment.id)}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedProofId(payment.id);
                      }
                    }}
                  >
                   <TableCell>
                      <p className="font-bold text-sm">{payment.booking?.session?.template?.title || t('dashboard.labels.booking')}</p>
                      <p className="text-[10px] text-muted-foreground font-mono italic">#{payment.booking?.id?.substring(0, 8)}</p>
                      {payment.booking?.manualPaymentChannel && (
                        <p className="text-[10px] font-semibold text-muted-foreground">
                          {payment.booking.manualPaymentChannel === 'CASH_PLUS' ? t('dashboard.labels.methodCashPlus') : t('dashboard.labels.methodBankTransfer')}
                          {payment.transactionCode ? ` · ${payment.transactionCode}` : ''}
                        </p>
                      )}
                   </TableCell>
                   <TableCell className="text-sm font-medium">
                      {payment.booking?.traveler?.name || t('dashboard.labels.traveler')}
                   </TableCell>
                   <TableCell className="text-sm font-semibold">
                     {payment.booking?.totalAmount ?? payment.amount} {payment.booking?.session.currency ?? t('dashboard.labels.currency')}
                     {bankMeta && (
                       <div className="mt-2 space-y-1">
                         <Badge className={`text-[8px] font-black uppercase ${bankMeta.className}`}>{bankMeta.label}</Badge>
                         {bankConfirmation && (
                           <div className="text-[11px] font-medium text-muted-foreground space-y-0.5">
                             {bankConfirmation.confirmedAmount != null && (
                               <p>{t('dashboard.labels.bankConfirmedAmount')}: {bankConfirmation.confirmedAmount} {payment.booking?.session.currency ?? t('dashboard.labels.currency')}</p>
                             )}
                             {bankConfirmation.bankReference && (
                               <p>{t('dashboard.labels.bankReference')}: {bankConfirmation.bankReference}</p>
                             )}
                             {bankConfirmation.bankConfirmedAt && (
                               <p>{t('dashboard.labels.bankConfirmedAt')}: {new Date(bankConfirmation.bankConfirmedAt).toLocaleString()}</p>
                             )}
                             {bankConfirmation.bankConfirmedBy && (
                               <p>{t('dashboard.labels.bankConfirmedBy')}: {bankConfirmation.bankConfirmedBy}</p>
                             )}
                           </div>
                         )}
                       </div>
                     )}
                   </TableCell>
                   <TableCell className="text-sm text-muted-foreground">
                      {payment.uploadedAt ? new Date(payment.uploadedAt).toLocaleDateString() : t('dashboard.labels.na')}
                   </TableCell>
                   <TableCell className="text-sm font-semibold text-muted-foreground">
                      {ageLabel(payment.uploadedAt)}
                   </TableCell>
                   <TableCell className="text-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedProofId(payment.id);
                          onViewProof(payment.booking?.id || payment.bookingId);
                        }}
                        disabled={viewingProofId === (payment.booking?.id || payment.bookingId)}
                      >
                        <Eye className="h-4 w-4 ms-2" />
                        {viewingProofId === (payment.booking?.id || payment.bookingId) ? t('dashboard.messages.loading') : t('dashboard.actions.view')}
                      </Button>
                     </TableCell>
                  </TableRow>
               );
})}
           </TableBody>
         </Table>
      ) : (
        <div className="p-10 text-center text-sm text-muted-foreground">
          {t('dashboard.messages.noPaymentProofs')}
        </div>
)}
    </div>
    {selectedProof && (
      <aside
        aria-label={t('dashboard.labels.decisionPanel')}
        className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('dashboard.labels.selectedProof')}
          </p>
          <h3 className="mt-1 font-bold text-foreground">
            {selectedProof.booking?.session?.template?.title || t('dashboard.labels.booking')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {selectedProof.booking?.traveler?.name || t('dashboard.labels.traveler')} ·{' '}
            {selectedProof.booking?.totalAmount ?? selectedProof.amount}{' '}
            {selectedProof.booking?.session.currency ?? t('dashboard.labels.currency')} ·{' '}
            {ageLabel(selectedProof.uploadedAt)}
          </p>
        </div>
        {/* The attestation copy beside the item being decided (mockup
            Option A): accepting the image records the traveller's
            claim — it is not settlement. */}
        <p className="rounded-2xl bg-sand/60 px-4 py-3 text-sm text-foreground">
          {t('dashboard.meta.paymentProofs.description')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
            disabled={!selectedCanReject || isVerifying}
            onClick={() => handleReject(selectedProof)}
          >
            {t('dashboard.actions.reject')}
          </Button>
          {/* #422: the wire value stays VERIFIED (the API's decision
              value), but the API treats it as ACCEPTING the proof image
              only — the label must say that, never "approve/verify
              payment". There is deliberately no bank-confirm button
              here: only the agency can confirm its bank receipt. */}
          <Button
            size="sm"
            className="bg-success text-success-foreground hover:bg-success/90 border-none"
            disabled={!selectedCanApprove || isVerifying}
            onClick={() => onVerifyPayment(selectedProof.id, VerificationStatus.Verified)}
          >
            {t('dashboard.actions.acceptProof')}
          </Button>
        </div>
      </aside>
    )}
   </div>
    <Pagination pagination={pagination} onPageChange={onPageChange} labels={paginationLabels} className="mt-2" />
 </div>
  );
}
