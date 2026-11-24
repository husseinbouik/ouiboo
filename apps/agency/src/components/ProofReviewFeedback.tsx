'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MOTION_TOKENS } from '@ouiboo/tokens';

export type ProofReviewDecision = 'accepted' | 'rejected' | 'confirmed';

/**
 * Design Council Phase 4 — Motion M5 (agency side): staged feedback for
 * a payment-proof decision, mirroring the traveller side's
 * ProofUploadFeedback. A decision never resolves silently: accepting a
 * proof states plainly that it is NOT settlement (only the bank-credit
 * confirmation settles), rejecting states the traveller was asked for a
 * new proof, and confirming states the payment is settled. Reduced
 * motion is inherited from the app MotionConfig + tokens kill-switch.
 */
export function ProofReviewFeedback({ decision }: { decision: ProofReviewDecision | null }) {
  const { t } = useTranslation();
  if (!decision) return null;
  // Reduced motion is handled by the app-level MotionConfig
  // (reducedMotion="user") + the tokens.css kill-switch, as elsewhere.
  const duration = Number.parseFloat(MOTION_TOKENS.durations.standard) / 1000;
  const message =
    decision === 'accepted'
      ? t('paymentProof.feedbackAccepted')
      : decision === 'rejected'
        ? t('paymentProof.feedbackRejected')
        : t('paymentProof.feedbackConfirmed');
  const Icon = decision === 'rejected' ? XCircle : CheckCircle2;
  return (
    <div aria-live="polite" className="min-h-6">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={decision}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          className="flex items-start gap-2 text-sm font-semibold text-foreground"
          data-testid="proof-review-feedback"
          data-decision={decision}
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {message}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
