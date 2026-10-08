'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '@ouiboo/ui';

interface PaymentProofRejectionFormProps {
  rejectionReason: string;
  rejectionError: string;
  showRejectConfirm: boolean;
  isLoading: boolean;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onReviewRejection: () => void;
  onBackToEdit: () => void;
  onConfirm: () => void;
}

export function PaymentProofRejectionForm({
  rejectionReason,
  rejectionError,
  showRejectConfirm,
  isLoading,
  onReasonChange,
  onCancel,
  onReviewRejection,
  onBackToEdit,
  onConfirm,
}: PaymentProofRejectionFormProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-3 pt-4 border-t border-border"
    >
      <div>
        <label className="text-sm font-medium text-foreground flex items-center justify-between">
          <span>{t('paymentProof.rejectionReason')}</span>
          <span className="text-xs text-muted-foreground">
            {rejectionReason.length} / 500
          </span>
        </label>
        <textarea
          value={rejectionReason}
          onChange={(e) => {
            onReasonChange(e.target.value);
          }}
          placeholder={t('paymentProof.rejectionPlaceholder')}
          className="mt-2 w-full h-24 p-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t('paymentProof.minChars')}
        </p>
        {rejectionError ? (
          <p role="alert" className="mt-2 text-sm font-medium text-danger">
            {rejectionError}
          </p>
        ) : null}
      </div>

      {!showRejectConfirm ? (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            {t('paymentProof.cancel')}
          </Button>
          <Button
            onClick={onReviewRejection}
            disabled={isLoading || rejectionReason.trim().length < 10}
            className="bg-danger text-danger-foreground hover:bg-danger/90"
          >
            {t('paymentProof.reviewRejection')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 p-4 bg-danger/10 border border-danger/20 rounded-lg">
          <p className="font-semibold text-danger">{t('paymentProof.confirmRejection')}</p>
          <p className="text-sm text-danger/80">
            {t('paymentProof.rejectionBody')}
          </p>
          <div className="bg-card p-3 rounded border border-danger/20 text-sm text-foreground italic">
            &ldquo;{rejectionReason}&rdquo;
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onBackToEdit}
              disabled={isLoading}
            >
              {t('paymentProof.back')}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="bg-danger text-danger-foreground hover:bg-danger/90 flex-1"
            >
              {isLoading ? t('paymentProof.rejecting') : t('paymentProof.confirmRejection')}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
