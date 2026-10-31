'use client';

import { useTranslation } from 'react-i18next';
import { Card } from '@ouiboo/ui';
import { ReceiptText } from 'lucide-react';
import type { CancellationScaleSnapshot } from '@ouiboo/types';
import { CancellationScaleCard } from './CancellationScaleCard';
import { TravelerRefundActions, type TravelerRefundActionCase } from './TravelerRefundActions';
import { formatCurrency } from '@ouiboo/utils';

/**
 * #699 (Council S6): the traveller's end-to-end RefundCase view on the
 * booking page — case state as a tracked timeline, the snapshotted
 * cancellation scale the case runs under, amounts in MAD, and the
 * agency named as the executing obligor. Ouiboo tracks and escalates;
 * the agency refunds. No copy here promises a refund in Ouiboo's name.
 */
export interface TravelerRefundCaseView extends TravelerRefundActionCase {
  bookingId: string;
  requestedAmount: string;
  approvedAmount?: string | null;
  currency: string;
  reason?: string | null;
  refundDueAt?: string | null;
  requestedAt?: string | null;
  approvedAt?: string | null;
  initiatedAt?: string | null;
  completedAt?: string | null;
  agency?: { companyName?: string | null; legalName?: string | null } | null;
  booking?: { cancellationScale?: unknown } | null;
}

const TIMELINE: Array<{ key: string; statuses: string[] }> = [
  { key: 'requested', statuses: ['REFUND_REQUESTED'] },
  { key: 'review', statuses: ['ELIGIBILITY_REVIEW', 'REFUND_APPROVED'] },
  { key: 'initiated', statuses: ['REFUND_INITIATED'] },
  { key: 'completed', statuses: ['REFUND_COMPLETED'] },
];

function timelineStep(status: string): number {
  if (status === 'REFUND_COMPLETED') return 3;
  if (status === 'REFUND_INITIATED') return 2;
  if (status === 'ELIGIBILITY_REVIEW' || status === 'REFUND_APPROVED' || status === 'AGENCY_ACTION_REQUIRED') return 1;
  return 0;
}

export function RefundCaseCard({ refundCase }: { refundCase: TravelerRefundCaseView }) {
  const { t, i18n } = useTranslation();
  const agencyName =
    refundCase.agency?.legalName?.trim() || refundCase.agency?.companyName?.trim() || t('refunds.defaultAgency');
  const amount = refundCase.approvedAmount ?? refundCase.requestedAmount;
  const currentStep = timelineStep(refundCase.status);
  const terminalNegative = ['REFUND_REJECTED', 'REFUND_FAILED', 'REFUND_OVERDUE'].includes(refundCase.status);
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(i18n.language || 'en', { dateStyle: 'medium' }).format(new Date(value));

  return (
    <Card className="rounded-3xl border border-border shadow-sm bg-card" data-testid="refund-case-card">
      <div className="p-8 space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-sunset-orange" /> {t('refundCase.title')}
          </p>
          <h2 className="mt-2 text-2xl font-black font-display tracking-tight text-foreground">
            {t(`refundCase.status.${refundCase.status}`, {
              defaultValue: refundCase.status.replaceAll('_', ' '),
            })}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('refundCase.obligorLine', { agency: agencyName })}
          </p>
          <p className="text-sm text-muted-foreground">{t('refundCase.trackingLine')}</p>
        </div>

        <ol className="flex flex-wrap gap-2" aria-label={t('refundCase.timelineLabel')}>
          {TIMELINE.map((step, index) => (
            <li
              key={step.key}
              className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                !terminalNegative && index <= currentStep
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-border/60 text-muted-foreground'
              }`}
            >
              {t(`refundCase.step.${step.key}`)}
            </li>
          ))}
          {terminalNegative && (
            <li className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">
              {t(`refundCase.status.${refundCase.status}`, { defaultValue: refundCase.status.replaceAll('_', ' ') })}
            </li>
          )}
        </ol>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('refundCase.amount')}</p>
            <p className="mt-2 font-semibold text-foreground">
              {formatCurrency(amount, refundCase.currency, i18n.language)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('refundCase.dueBy')}</p>
            <p className="mt-2 font-semibold text-foreground">
              {refundCase.refundDueAt ? formatDate(refundCase.refundDueAt) : t('refundCase.duePending')}
            </p>
          </div>
        </div>

        {refundCase.booking?.cancellationScale != null && (
          <CancellationScaleCard
            scale={refundCase.booking.cancellationScale as CancellationScaleSnapshot}
            baseAmount={Number(refundCase.requestedAmount)}
            currency={refundCase.currency}
          />
        )}

        <TravelerRefundActions refundCase={refundCase} />
      </div>
    </Card>
  );
}
