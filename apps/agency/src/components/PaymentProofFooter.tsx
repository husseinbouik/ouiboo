'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ouiboo/ui';

interface PaymentProofFooterProps {
  isReadOnly: boolean;
  isLoading: boolean;
  showRejectInput: boolean;
  onClose: () => void;
  onRejectClick: () => void;
  onApprove: () => void;
}

export function PaymentProofFooter({
  isReadOnly,
  isLoading,
  showRejectInput,
  onClose,
  onRejectClick,
  onApprove,
}: PaymentProofFooterProps) {
  const { t } = useTranslation();

  if (isReadOnly) {
    return (
      <div className="sticky bottom-0 bg-card border-t border-border p-6 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          {t('paymentProof.close')}
        </Button>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 bg-card border-t border-border p-6 flex gap-3 justify-end">
      <Button variant="outline" onClick={onClose} disabled={isLoading}>
        {t('paymentProof.close')}
      </Button>
      <Button
        onClick={onRejectClick}
        disabled={isLoading || showRejectInput}
        variant="outline"
        className="text-danger hover:bg-danger/10 hover:text-danger border-danger/20"
      >
        {showRejectInput ? t('paymentProof.enteringReason') : t('paymentProof.rejectPayment')}
      </Button>
      <Button
        onClick={onApprove}
        disabled={isLoading || showRejectInput}
        className="bg-success text-success-foreground hover:bg-success/90"
      >
        {isLoading ? t('paymentProof.approving') : t('paymentProof.approvePayment')}
      </Button>
    </div>
  );
}
