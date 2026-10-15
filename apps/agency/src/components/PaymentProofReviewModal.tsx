'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { VerificationStatus, type BookingDetails } from '@ouiboo/types';
import { formatCurrency } from '@ouiboo/utils';
import { getFileTypeFromUrl } from './paymentProofUtils';
import { PaymentProofStatusBanner } from './PaymentProofStatusBanner';
import { PaymentProofBookingCard } from './PaymentProofBookingCard';
import { PaymentProofViewer } from './PaymentProofViewer';
import { PaymentProofRejectionForm } from './PaymentProofRejectionForm';
import { PaymentProofFooter } from './PaymentProofFooter';

interface PaymentProofReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: BookingDetails | null;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  isLoading?: boolean;
  readOnly?: boolean;
}

export function PaymentProofReviewModal({
  isOpen,
  onClose,
  booking,
  onApprove,
  onReject,
  isLoading = false,
  readOnly = false,
}: PaymentProofReviewModalProps) {
  const { t, i18n } = useTranslation();
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectionError, setRejectionError] = useState('');

  if (!booking) return null;

  const hasFinalReviewStatus = booking.paymentProof?.status && booking.paymentProof.status !== VerificationStatus.Pending;
  const isReadOnly = Boolean(readOnly || hasFinalReviewStatus);
  const tripTitle = booking.session.template.title || t('paymentProof.trip');
  const travelerName = booking.fullName || booking.traveler?.name || t('paymentProof.traveler');
  const amountText = formatCurrency(booking.totalAmount, booking.currency, i18n.language);
  const proofUrl = booking.paymentProof?.imageUrl ? `/bookings/${booking.id}/payment-proof/download` : null;
  const fileType = proofUrl ? getFileTypeFromUrl(proofUrl) : 'unknown';

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
                  {isReadOnly
                    ? t('paymentProof.viewOnly')
                    : t('paymentProof.reviewAndApprove')}
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

            {/* Status Banner */}
            {isReadOnly && <PaymentProofStatusBanner booking={booking} />}

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

              {/* Rejection Reason Input */}
              {showRejectInput && !isReadOnly && (
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
              isReadOnly={isReadOnly}
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
