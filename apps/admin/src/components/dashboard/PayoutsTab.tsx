'use client';

import React from 'react';
import { CalendarClock, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { Button, Card, Badge, Pagination } from '@ouiboo/ui';
import { PayoutStatus } from '@ouiboo/types';
import type { PaginationMeta } from '@ouiboo/utils';
import type { AdminPayoutRequest, FeedbackState } from './types';
import { getAdminPayoutBadgeMeta } from '../../app/status-mappers';
import { renderBankDetails } from './formatters';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type PayoutsTabProps = {
  t: TFn;
  payouts: AdminPayoutRequest[];
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
  payoutFeedback: FeedbackState | null;
  selectedPayout: AdminPayoutRequest | null;
  isProcessing: boolean;
  onSelectPayout: (payout: AdminPayoutRequest | null) => void;
  onProcessPayout: (id: string, status: string) => void;
};

export default function PayoutsTab({
  t,
  payouts,
  pagination,
  onPageChange,
  paginationLabels,
  payoutFeedback,
  selectedPayout,
  isProcessing,
  onSelectPayout,
  onProcessPayout,
}: PayoutsTabProps) {
  return (
<div className="space-y-6 animate-in fade-in duration-500">
   <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
      <CalendarClock className="h-5 w-5 text-sunset-orange" />
      {t('dashboard.sections.payouts')} ({pagination?.total ?? payouts.length})
   </h2>
   <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
      <div className="space-y-4">
         {payouts.length ? (
           payouts.map((payout) => {
            const payoutMeta = getAdminPayoutBadgeMeta(payout.status, t);
            const isPendingPayout = payout.status === PayoutStatus.Pending;
            return (
            <Card key={payout.id} className="border-none shadow-sm p-5 bg-card">
               <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                     <p className="text-sm text-muted-foreground">{t('dashboard.labels.requestId', { id: payout.id?.slice(0, 8) ?? '' })}</p>
                     <h3 className="font-bold text-foreground">{payout.agency?.companyName || t('dashboard.labels.agencyPayout')}</h3>
                     <p className="text-xs text-muted-foreground">
                       {payout.requestedAt ? new Date(payout.requestedAt).toLocaleDateString() : t('dashboard.labels.na')} - {payout.amount} {t('dashboard.labels.currency')}
                     </p>
                     <p className="text-[11px] font-medium text-muted-foreground">{payoutMeta.helperText}</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <Badge className={payoutMeta.className}>{payoutMeta.label}</Badge>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => {
                         onSelectPayout(payout);
                         
                       }}
                     >
                       <Eye className="h-4 w-4 ms-2" />
                       {t('dashboard.actions.details')}
                     </Button>
                     <Button
                       size="sm"
                       className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
                       onClick={() => onProcessPayout(payout.id, PayoutStatus.Rejected)}
                       disabled={!isPendingPayout || isProcessing}
                     >
                       {t('dashboard.actions.reject')}
                     </Button>
                     <Button
                       size="sm"
                       className="bg-success text-success-foreground hover:bg-success/90 border-none"
                       onClick={() => onProcessPayout(payout.id, PayoutStatus.Paid)}
                       disabled={!isPendingPayout || isProcessing}
                     >
                       {t('dashboard.actions.approve')}
                     </Button>
                  </div>
               </div>
            </Card>
         )})
         ) : (
           <Card className="border-none shadow-sm p-6 bg-card text-sm text-muted-foreground">
             {t('dashboard.messages.noPayoutRequests')}
           </Card>
         )}
</div>
       <Pagination pagination={pagination} onPageChange={onPageChange} labels={paginationLabels} className="pt-2" />
       <Card className="border-none shadow-sm p-6 bg-card h-fit">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">{t('dashboard.labels.payoutDetails')}</h3>
          {selectedPayout && (
            <Badge className="bg-sunset-orange/10 text-sunset-orange">{t('dashboard.labels.selected')}</Badge>
          )}
        </div>
        {!selectedPayout && (
          <p className="text-sm text-muted-foreground mt-4">{t('dashboard.messages.selectPayoutPrompt')}</p>
        )}
        {selectedPayout && (
          <div className="mt-4 space-y-5">
            {(() => {
              const payoutMeta = getAdminPayoutBadgeMeta(selectedPayout.status, t);
              const isPendingPayout = selectedPayout.status === PayoutStatus.Pending;
              return (
                <>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.agency')}</p>
              <p className="text-base font-bold text-foreground">{selectedPayout.agency?.companyName || t('dashboard.labels.agencyPayout')}</p>
              <p className="text-sm text-muted-foreground">{selectedPayout.agency?.user?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={payoutMeta.className}>{payoutMeta.label}</Badge>
              <p className="text-xs font-medium text-muted-foreground">{payoutMeta.helperText}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.requested')}</p>
                <p className="font-medium text-foreground">{selectedPayout.requestedAt ? new Date(selectedPayout.requestedAt).toLocaleDateString() : t('dashboard.labels.na')}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.amount')}</p>
                <p className="font-medium text-foreground">{selectedPayout.amount} {t('dashboard.labels.currency')}</p>
              </div>
            </div>
            {selectedPayout.processedAt && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.status')}</p>
                <p className="font-medium text-foreground">{new Date(selectedPayout.processedAt).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('dashboard.labels.bankDetails')}</p>
              <div className="space-y-2 text-sm">
                {renderBankDetails(selectedPayout.bankDetails, t)}
              </div>
            </div>
            {payoutFeedback && (
              <div className={`text-sm font-medium ${payoutFeedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
                {payoutFeedback.message}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-success text-success-foreground hover:bg-success/90 border-none"
                onClick={() => onProcessPayout(selectedPayout.id, PayoutStatus.Paid)}
                disabled={!isPendingPayout || isProcessing}
              >
                {t('dashboard.actions.approvePayout')}
              </Button>
              <Button
                className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
                onClick={() => onProcessPayout(selectedPayout.id, PayoutStatus.Rejected)}
                disabled={!isPendingPayout || isProcessing}
              >
                {t('dashboard.actions.rejectPayout')}
              </Button>
            </div>
                </>
              );
            })()}
          </div>
        )}
      </Card>
   </div>
</div>
  );
}
