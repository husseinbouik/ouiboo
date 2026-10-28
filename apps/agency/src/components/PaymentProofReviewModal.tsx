'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { BookingDetails } from '@ouiboo/types';
import { formatCurrency } from '@ouiboo/utils';
import { apiClient } from '@/lib/api-client';
import {
  getExpectedStageAmount,
  getFileTypeFromUrl,
  getProofReviewStage,
  type ProofFileType,
} from './paymentProofUtils';
import { PaymentProofStatusBanner } from './PaymentProofStatusBanner';
import { PaymentProofBookingCard } from './PaymentProofBookingCard';
import { PaymentProofViewer } from './PaymentProofViewer';
import { PaymentProofRejectionForm } from './PaymentProofRejectionForm';
import { PaymentProofFooter } from './PaymentProofFooter';
import {
  PaymentProofBankConfirmation,
  type BankConfirmationPayload,
} from './PaymentProofBankConfirmation';

interface PaymentProofReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: BookingDetails | null;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  onConfirmBankPayment?: (payload: BankConfirmationPayload) => void;
  isLoading?: boolean;
  isConfirming?: boolean;
  actionError?: string | null;
  readOnly?: boolean;
}

/**
 * #422 (Council P0-20): two-step manual payment review.
 * Step 1 (proof PENDING): accept or reject the proof image — accepting is
 * not settlement. Step 2 (proof ACCEPTED): the bank-confirmation panel —
 * only confirming the observed bank credit settles the payment. VERIFIED
 * (bank-confirmed) and REJECTED proofs are final and read-only.
 */
export function PaymentProofReviewModal({
  isOpen,
  onClose,
  booking,
  onApprove,
  onReject,
  onConfirmBankPayment,
  isLoading = false,
  isConfirming = false,
  actionError = null,
  readOnly = false,
}: PaymentProofReviewModalProps) {
  const { t, i18n } = useTranslation();
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectionError, setRejectionError] = useState('');
  const [proofObjectUrl, setProofObjectUrl] = useState<string | null>(null);
  const [proofContentType, setProofContentType] = useState<string | null>(null);
  const [proofRetryCount, setProofRetryCount] = useState(0);

  const proofBookingId = booking?.id;
  const hasProof = Boolean(booking?.paymentProof?.imageUrl);

  // #422: the proof download endpoint requires authentication, and an
  // <img>/<iframe> cannot send the Authorization header — a bare URL 401s
  // (and the old host-less relative path 404'd on the agency origin).
  // Fetch the proof through the authenticated apiClient as a blob, like
  // the admin app does, and render the object URL. It is revoked when the
  // modal closes, the booking changes, or the component unmounts.
  useEffect(() => {
    if (!isOpen) return;
    if (!proofBookingId || !hasProof) {
      setImageLoading(false);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    setImageLoading(true);
    setImageError(false);
    void (async () => {
      try {
        const response = await apiClient.get(
          `/bookings/${proofBookingId}/payment-proof/download`,
          { responseType: 'blob' },
        );
        if (cancelled) return;
        const headerType = response.headers?.['content-type'];
        const contentType =
          typeof headerType === 'string' && headerType
            ? headerType
            : response.data instanceof Blob
              ? response.data.type
              : '';
        const blob =
          response.data instanceof Blob && contentType && response.data.type !== contentType
            ? new Blob([response.data], { type: contentType })
            : response.data;
        objectUrl = URL.createObjectURL(blob as Blob);
        setProofContentType(contentType || null);
        setProofObjectUrl(objectUrl);
      } catch {
        if (cancelled) return;
        setImageLoading(false);
        setImageError(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setProofObjectUrl(null);
      setProofContentType(null);
    };
  }, [isOpen, proofBookingId, hasProof, proofRetryCount]);

  if (!booking) return null;

  const stage = getProofReviewStage(booking.paymentProof?.status);
  const isFinalStage = stage === 'final';
  const isBankConfirmationStage = stage === 'bank-confirmation';
  const isReadOnly = Boolean(readOnly || isFinalStage);
  // In the bank-confirmation stage the only action lives in the panel, so
  // the footer degrades to close-only (same as read-only).
  const footerReadOnly = isReadOnly || isBankConfirmationStage;
  let headerSubtitle = t('paymentProof.reviewAndApprove');
  if (isReadOnly) {
    headerSubtitle = t('paymentProof.viewOnly');
  }
  if (isBankConfirmationStage) {
    headerSubtitle = t('paymentProof.acceptedSubtitle');
  }
  const tripTitle = booking.session.template.title || t('paymentProof.trip');
  const travelerName = booking.fullName || booking.traveler?.name || t('paymentProof.traveler');
  const amountText = formatCurrency(booking.totalAmount, booking.currency, i18n.language);
  const proofUrl = hasProof ? proofObjectUrl : null;
  // The response content type is authoritative once the blob arrives;
  // before that, fall back to the stored proof filename's extension.
  const fileType: ProofFileType = proofContentType
    ? proofContentType.includes('pdf')
      ? 'pdf'
      : proofContentType.startsWith('image/')
        ? 'image'
        : getFileTypeFromUrl(booking.paymentProof?.imageUrl ?? '')
    : getFileTypeFromUrl(booking.paymentProof?.imageUrl ?? '');

  const handleClose = () => {
    setShowRejectInput(false);
    setRejectionReason('');
    setImageError(false);
    setImageLoading(true);
    setShowRejectConfirm(false);
    setRejectionError('');
    onClose();
  };

  const handleApprove = () => {
    if (!onApprove) {
      return;
    }
    onApprove();
  };

  const handleRejectClick = () => {
    setShowRejectInput(true);
  };

  const handleReasonChange = (value: string) => {
    setRejectionReason(value.slice(0, 500));
    setRejectionError('');
  };

  const handleRejectCancel = () => {
    setShowRejectInput(false);
    setRejectionReason('');
  };

  const handleRejectConfirm = () => {
    if (!rejectionReason.trim()) {
      setRejectionError(t('paymentProof.rejectionReasonRequired'));
      return;
    }
    if (rejectionReason.trim().length < 10) {
      setRejectionError(t('paymentProof.rejectionReasonMinLength'));
      return;
    }
    if (!onReject) {
      return;
    }
    onReject(rejectionReason.trim());
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const handleImageRetry = () => {
    setImageError(false);
    setImageLoading(true);
    setProofRetryCount((count) => count + 1);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-card rounded-2xl shadow-2xl z-[101] overflow-hidden border border-border max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border p-6 flex justify-between items-start gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">
                  {t('paymentProof.reviewTitle')}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {headerSubtitle}
                </p>
              </div>
              <button
                onClick={handleClose}
                aria-label={t('paymentProof.close')}
                className="p-2 hover:bg-muted rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Status Banner — final states and the accepted intermediate */}
            {(isFinalStage || isBankConfirmationStage) && <PaymentProofStatusBanner booking={booking} />}

            {/* Content */}
            <div className="p-6 space-y-6">
              <PaymentProofBookingCard
                booking={booking}
                tripTitle={tripTitle}
                travelerName={travelerName}
                amountText={amountText}
              />

              <PaymentProofViewer
                proofUrl={proofUrl}
                fileType={fileType}
                imageLoading={imageLoading}
                imageError={imageError}
                onLoad={handleImageLoad}
                onError={handleImageError}
                onRetry={handleImageRetry}
              />

              {actionError ? (
                <p role="alert" className="text-sm font-medium text-danger">
                  {actionError}
                </p>
              ) : null}

              {/* Step 2 — bank confirmation (proof accepted, not settled) */}
              {isBankConfirmationStage && !readOnly && onConfirmBankPayment && (
                <PaymentProofBankConfirmation
                  key={booking.id}
                  expectedAmount={getExpectedStageAmount(booking)}
                  currency={booking.currency}
                  isLoading={isConfirming}
                  onConfirm={onConfirmBankPayment}
                />
              )}

              {/* Rejection Reason Input */}
              {showRejectInput && !isReadOnly && !isBankConfirmationStage && (
                <PaymentProofRejectionForm
                  rejectionReason={rejectionReason}
                  rejectionError={rejectionError}
                  showRejectConfirm={showRejectConfirm}
                  isLoading={isLoading}
                  onReasonChange={handleReasonChange}
                  onCancel={handleRejectCancel}
                  onReviewRejection={() => setShowRejectConfirm(true)}
                  onBackToEdit={() => setShowRejectConfirm(false)}
                  onConfirm={handleRejectConfirm}
                />
              )}
            </div>

            <PaymentProofFooter
              isReadOnly={footerReadOnly}
              isLoading={isLoading}
              showRejectInput={showRejectInput}
              onClose={handleClose}
              onRejectClick={handleRejectClick}
              onApprove={handleApprove}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
