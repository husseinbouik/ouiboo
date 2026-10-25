'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Landmark } from 'lucide-react';
import { Button, Input, Label } from '@ouiboo/ui';
import { formatCurrency } from '@ouiboo/utils';
import { isBankConfirmationReady } from './paymentProofUtils';

export interface BankConfirmationPayload {
  confirmedAmount: number;
  bankReference: string;
}

interface PaymentProofBankConfirmationProps {
  /** Stage amount the API expects — prefilled, editable. */
  expectedAmount: number;
  currency?: string;
  isLoading?: boolean;
  onConfirm: (payload: BankConfirmationPayload) => void;
}

/**
 * #422 (Council P0-20) step 2 of the manual payment review: after the
 * proof image is ACCEPTED, the agency confirms the credit it actually
 * observed in its own bank account. Only this step settles the payment —
 * the confirm action stays disabled until a bank reference is entered.
 */
export function PaymentProofBankConfirmation({
  expectedAmount,
  currency,
  isLoading = false,
  onConfirm,
}: PaymentProofBankConfirmationProps) {
  const { t, i18n } = useTranslation();
  const [confirmedAmount, setConfirmedAmount] = useState(String(expectedAmount));
  const [bankReference, setBankReference] = useState('');

  const ready = isBankConfirmationReady(confirmedAmount, bankReference);
  const expectedText = formatCurrency(expectedAmount, currency, i18n.language);

  const handleConfirm = () => {
    if (!ready) return;
    onConfirm({
      confirmedAmount: Number(confirmedAmount),
      bankReference: bankReference.trim(),
    });
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Landmark className="h-5 w-5 text-accent" />
        {t('paymentProof.bankConfirmationTitle')}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {t('paymentProof.bankConfirmationInstruction')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bank-confirmation-amount">
            {t('paymentProof.confirmedAmount')}
          </Label>
          <Input
            id="bank-confirmation-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={confirmedAmount}
            onChange={(e) => setConfirmedAmount(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            {t('paymentProof.confirmedAmountHint', { amount: expectedText })}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bank-confirmation-reference">
            {t('paymentProof.bankReference')}
          </Label>
          <Input
            id="bank-confirmation-reference"
            type="text"
            value={bankReference}
            onChange={(e) => setBankReference(e.target.value)}
            placeholder={t('paymentProof.bankReferencePlaceholder')}
            disabled={isLoading}
            aria-required="true"
          />
          <p className="text-xs text-muted-foreground">
            {t('paymentProof.bankReferenceHint')}
          </p>
        </div>
      </div>

      <Button
        onClick={handleConfirm}
        disabled={!ready || isLoading}
        className="bg-success text-success-foreground hover:bg-success/90 w-full md:w-auto"
      >
        {isLoading ? t('paymentProof.confirmingBankReceipt') : t('paymentProof.confirmBankReceipt')}
      </Button>
    </div>
  );
}
