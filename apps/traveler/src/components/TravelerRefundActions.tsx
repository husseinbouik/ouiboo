'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@ouiboo/ui';
import {
    TRAVELER_REFUND_DISPUTE_WINDOW_DAYS,
    canConfirmTravelerRefundReceipt,
    canDisputeTravelerRefund,
    travelerRefundDisputeDeadline,
} from '@ouiboo/utils';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

/** #416C: the refund-case fields the traveller receipt actions need. */
export interface TravelerRefundActionCase {
    id: string;
    status: string;
    completedAt?: string | null;
    travellerConfirmedAt?: string | null;
    disputedAt?: string | null;
}

/**
 * #416C (Council P0-09): traveller receipt actions on a refund case.
 *
 * - While the refund is REFUND_INITIATED (sent by the agency, arrival
 *   pending), the traveller can confirm receipt. That confirmation is
 *   tier-4 evidence: it corroborates the refund, it NEVER completes
 *   the case — completion rests on the bank's or payment provider's
 *   confirmation, not on anyone's word alone.
 * - Once REFUND_COMPLETED, the panel states that basis plainly (the
 *   traveller's payment went directly to the organiser; OuiBoo never
 *   holds the money) and offers the dispute action inside the
 *   dispute window: "the money never arrived" reopens the case.
 */
export function TravelerRefundActions({ refundCase }: { refundCase: TravelerRefundActionCase }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [confirming, setConfirming] = useState(false);
    const [disputeOpen, setDisputeOpen] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputing, setDisputing] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const confirmReceiptMutation = useMutation({
        mutationFn: async () => {
            await apiClient.post(`/refunds/mine/${refundCase.id}/confirm-receipt`);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['my-refunds'] });
            setConfirming(false);
            setActionError(null);
        },
        onError: () => {
            setConfirming(false);
            setActionError(t('refunds.actionFailed'));
        },
    });

    const disputeRefundMutation = useMutation({
        mutationFn: async (reason: string) => {
            await apiClient.post(`/refunds/mine/${refundCase.id}/dispute-receipt`, { reason });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['my-refunds'] });
            void queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
            setDisputing(false);
            setDisputeOpen(false);
            setActionError(null);
        },
        onError: () => {
            setDisputing(false);
            setActionError(t('refunds.actionFailed'));
        },
    });

    if (refundCase.status !== 'REFUND_INITIATED' && refundCase.status !== 'REFUND_COMPLETED') {
        return null;
    }

    return (
        <>
            {refundCase.status === 'REFUND_INITIATED' && (
                refundCase.travellerConfirmedAt ? (
                    <p className="text-xs font-semibold text-foreground">
                        {t('refunds.receiptConfirmed', {
                            date: format(new Date(refundCase.travellerConfirmedAt), 'MMM dd, yyyy'),
                        })}
                    </p>
                ) : canConfirmTravelerRefundReceipt(refundCase) ? (
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                            {t('refunds.confirmReceiptHint')}
                        </p>
                        <Button
                            variant="outline"
                            className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                            disabled={confirming}
                            onClick={() => {
                                setConfirming(true);
                                confirmReceiptMutation.mutate();
                            }}
                        >
                            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : t('refunds.confirmReceipt')}
                        </Button>
                    </div>
                ) : null
            )}
            {refundCase.status === 'REFUND_COMPLETED' && (
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                        {t('refunds.completedBasis')}
                    </p>
                    {refundCase.disputedAt ? (
                        <p className="text-xs font-semibold text-foreground">
                            {t('refunds.disputed')}
                        </p>
                    ) : canDisputeTravelerRefund(refundCase) ? (
                        <>
                            <p className="text-xs text-muted-foreground">
                                {t('refunds.disputeHint', {
                                    date: format(travelerRefundDisputeDeadline(refundCase.completedAt) ?? new Date(), 'MMM dd, yyyy'),
                                    days: TRAVELER_REFUND_DISPUTE_WINDOW_DAYS,
                                })}
                            </p>
                            {disputeOpen ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={disputeReason}
                                        onChange={(e) => setDisputeReason(e.target.value)}
                                        placeholder={t('refunds.disputeReasonPlaceholder')}
                                        aria-label={t('refunds.disputeReasonPlaceholder')}
                                        rows={3}
                                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                                    />
                                    <Button
                                        variant="outline"
                                        className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                        disabled={disputing || !disputeReason.trim()}
                                        onClick={() => {
                                            setDisputing(true);
                                            disputeRefundMutation.mutate(disputeReason.trim());
                                        }}
                                    >
                                        {disputing ? <Loader2 className="h-4 w-4 animate-spin" /> : t('refunds.disputeSubmit')}
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="ghost"
                                    className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border/60"
                                    onClick={() => setDisputeOpen(true)}
                                >
                                    {t('refunds.dispute')}
                                </Button>
                            )}
                        </>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            {t('refunds.disputeWindowClosed', { days: TRAVELER_REFUND_DISPUTE_WINDOW_DAYS })}
                        </p>
                    )}
                </div>
            )}
            {actionError && (
                <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {actionError}
                </p>
            )}
        </>
    );
}
