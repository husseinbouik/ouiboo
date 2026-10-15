'use client';

import React from 'react';
import { CreditCard, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { Button, Card, Badge, Pagination } from '@ouiboo/ui';
import { VerificationStatus, type VerificationStatusType } from '@ouiboo/types';
import type { PaginationMeta } from '@ouiboo/utils';
import type { AdminPaymentProof, FeedbackState } from './types';
import { canApprovePaymentProof, canRejectPaymentProof } from './formatters';

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
  return (
<div className="space-y-6 animate-in fade-in duration-500">
    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
      <CreditCard className="h-5 w-5 text-sunset-orange" />
      {t('dashboard.sections.proofs')} ({pagination?.total ?? proofs.length})
   </h2>
   {paymentProofFeedback && (
     <div className={`text-sm font-medium ${paymentProofFeedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
       {paymentProofFeedback.message}
     </div>
   )}
   <div className="bg-card rounded-3xl overflow-hidden shadow-sm border border-border">
      {proofs.length ? (
        <div className="overflow-x-auto">
        <table className="w-full text-start">
          <thead className="bg-muted text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
             <tr>
                <th className="px-6 py-4">{t('dashboard.table.booking')}</th>
                <th className="px-6 py-4">{t('dashboard.table.traveler')}</th>
                <th className="px-6 py-4">{t('dashboard.table.amount')}</th>
                <th className="px-6 py-4">{t('dashboard.table.submitted')}</th>
                <th className="px-6 py-4 text-end">{t('dashboard.table.action')}</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-border">
             {proofs.map((payment) => {
               const proofStatus = payment.booking?.paymentProof?.status;
               const canApprove = canApprovePaymentProof(proofStatus);
               const canReject = canRejectPaymentProof(proofStatus);
               return (
                  <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                   <td className="px-6 py-4">
                      <p className="font-bold text-sm">{payment.booking?.session?.template?.title || t('dashboard.labels.booking')}</p>
                      <p className="text-[10px] text-muted-foreground font-mono italic">#{payment.booking?.id?.substring(0, 8)}</p>
                   </td>
                   <td className="px-6 py-4 text-sm font-medium">
                      {payment.booking?.traveler?.name || t('dashboard.labels.traveler')}
                   </td>
                   <td className="px-6 py-4 text-sm font-semibold">
                     {payment.booking?.totalAmount ?? payment.amount} {payment.booking?.session.currency ?? t('dashboard.labels.currency')}
                   </td>
                   <td className="px-6 py-4 text-sm text-muted-foreground">
                      {payment.uploadedAt ? new Date(payment.uploadedAt).toLocaleDateString() : t('dashboard.labels.na')}
                   </td>
                   <td className="px-6 py-4 text-end flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border"
                        onClick={() => onViewProof(payment.booking?.id || payment.bookingId)}
                        disabled={viewingProofId === (payment.booking?.id || payment.bookingId)}
                      >
                        <Eye className="h-4 w-4 ms-2" />
                        {viewingProofId === (payment.booking?.id || payment.bookingId) ? t('dashboard.messages.loading') : t('dashboard.actions.view')}
                      </Button>
                        <Button
                          size="sm"
                          className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
                          disabled={!canReject || isVerifying}
                          onClick={() => {
                            const reason = window.prompt(t('dashboard.prompts.paymentProofRejection'));
                            if (!reason) {
                              return;
                            }
                            onVerifyPayment(payment.id, VerificationStatus.Rejected);
                          }}
                      >
                        {t('dashboard.actions.reject')}
                      </Button>
                        <Button
                          size="sm"
                          className="bg-success text-success-foreground hover:bg-success/90 border-none"
                          disabled={!canApprove || isVerifying}
                          onClick={() => onVerifyPayment(payment.id, VerificationStatus.Verified)}
                        >
                          {t('dashboard.actions.approve')}
                        </Button>
                     </td>
                  </tr>
               );
})}
           </tbody>
         </table>
        </div>
      ) : (
        <div className="p-10 text-center text-sm text-muted-foreground">
          {t('dashboard.messages.noPaymentProofs')}
        </div>
)}
    </div>
    <Pagination pagination={pagination} onPageChange={onPageChange} labels={paginationLabels} className="mt-2" />
 </div>
  );
}
