'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MOTION_TOKENS } from '@ouiboo/tokens';

/**
 * Design Council Phase 2 — Motion M5 (traveller side): payment-proof
 * upload feedback. While the upload is in flight a staged progress
 * line shows; once a proof exists on the booking the surface
 * cross-fades to "received / under review" — an uploaded proof is
 * never presented as settled payment (the agency confirms receipt).
 * Honours prefers-reduced-motion: no cross-fade, instant swap.
 */
export function ProofUploadFeedback({
  uploading,
  hasProof,
}: {
  uploading: boolean;
  hasProof: boolean;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!uploading) {
      setStage(0);
      return;
    }
    const timers = [
      window.setTimeout(() => setStage(1), 600),
      window.setTimeout(() => setStage(2), 1400),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [uploading]);

  if (!uploading && !hasProof) return null;

  const duration = reduceMotion ? 0 : Number.parseFloat(MOTION_TOKENS.durations.standard) / 1000;

  return (
    <div aria-live="polite" className="min-h-6">
      <AnimatePresence mode="wait" initial={false}>
        {uploading ? (
          <motion.p
            key="uploading"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration }}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"
            data-testid="proof-upload-progress"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t(stage === 0 ? 'bookingDetail.proofStageSending' : stage === 1 ? 'bookingDetail.proofStageStoring' : 'bookingDetail.proofStageFinishing')}
          </motion.p>
        ) : (
          <motion.p
            key="received"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration }}
            className="flex items-center gap-2 text-sm font-semibold text-ocean-700 dark:text-ocean-300"
            data-testid="proof-upload-received"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {t('bookingDetail.proofReceivedUnderReview')}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
