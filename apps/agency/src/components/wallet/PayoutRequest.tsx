'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Label, Textarea } from '@ouiboo/ui';
import { formatCurrency } from '@ouiboo/utils';

type PayoutRequestProps = {
  availableBalance: number;
  currency: string;
  language: string;
  hasBankDetails: boolean;
  effectiveBankDetails: string;
  onBankDetailsChange: (value: string) => void;
  payoutAmount: string;
  onPayoutAmountChange: (value: string) => void;
  payoutError: string | null;
  payoutSuccess: string | null;
  isSubmitting: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
};

export function PayoutRequest({
  availableBalance,
  currency,
  language,
  hasBankDetails,
  effectiveBankDetails,
  onBankDetailsChange,
  payoutAmount,
  onPayoutAmountChange,
  payoutError,
  payoutSuccess,
  isSubmitting,
  canSubmit,
  onSubmit,
}: PayoutRequestProps) {
  const { t } = useTranslation();

  return (
    <Card id="request-payout" className="border-none shadow-sm bg-card border border-border">
      <CardHeader className="border-b border-border bg-muted/30">
        <CardTitle className="text-xl">{t('wallet.requestTitle')}</CardTitle>
        <CardDescription className="text-xs font-medium text-muted-foreground">
          {t('wallet.requestSubtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl border border-success/20 bg-success/10 p-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-success">{t('wallet.availableToWithdraw')}</p>
              <p className="text-3xl font-black text-success mt-2">
                {formatCurrency(availableBalance, currency, language)}
              </p>
              <p className="text-[10px] text-success/80 mt-2">
                {t('wallet.processingHint')}
              </p>
            </div>
            {!hasBankDetails && (
              <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4 text-[11px] font-semibold text-warning">
                {t('wallet.missingBankHint')}
              </div>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/settings" className="inline-flex">
                {t('wallet.updateBankDetails')}
              </Link>
            </Button>
          </div>

          <div className="lg:col-span-2 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('wallet.payoutAmountLabel', { currency })}</Label>
                <Input
                  type="number"
                  min={1}
                  max={availableBalance}
                  value={payoutAmount}
                  onChange={(event) => onPayoutAmountChange(event.target.value)}
                  className="h-12 font-semibold"
                  placeholder="0"
                />
                <p className="text-[10px] text-muted-foreground">{t('wallet.availableBalanceLine', { amount: formatCurrency(availableBalance, currency, language) })}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('wallet.bankDetailsForPayout')}</Label>
                <Textarea
                  value={effectiveBankDetails}
                  onChange={(event) => onBankDetailsChange(event.target.value)}
                  placeholder={t('wallet.bankDetailsPlaceholder')}
                  className="min-h-[120px] text-xs font-medium"
                />
                <p className="text-[10px] text-muted-foreground">{t('wallet.bankDetailsNote')}</p>
              </div>
            </div>

            {payoutError && (
              <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-semibold text-danger">
                {payoutError}
              </div>
            )}
            {payoutSuccess && (
              <div className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-xs font-semibold text-success">
                {payoutSuccess}
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                {t('wallet.manualReviewRequired')}
              </div>
              <Button
                onClick={onSubmit}
                disabled={!canSubmit || isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 h-11"
              >
                {isSubmitting ? t('wallet.submitting') : t('wallet.requestAction')}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
