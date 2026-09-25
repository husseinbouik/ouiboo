'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, FileText, Loader } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@ouiboo/ui';
import { VerificationStatus, type BookingDetails } from '@ouiboo/types';
import { formatCurrency } from '@ouiboo/utils';

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
  const isReadOnly = readOnly || hasFinalReviewStatus;
  const tripTitle = booking.session.template.title || t('paymentProof.trip');
  const travelerName = booking.fullName || booking.traveler?.name || t('paymentProof.traveler');
  const proofUrl = booking.paymentProof?.imageUrl ? `/bookings/${booking.id}/payment-proof/download` : null;

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

  const getFileTypeFromUrl = (url: string) => {
    if (!url) return 'unknown';
    const extension = url.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return 'image';
    } else if (extension === 'pdf') {
      return 'pdf';
    }
    return 'unknown';
  };

  const fileType = proofUrl ? getFileTypeFromUrl(proofUrl) : 'unknown';

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
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
            {isReadOnly && (
              <div
                className={`px-6 py-4 border-b ${
                  booking.paymentProof?.status === VerificationStatus.Verified
                    ? 'bg-success/10 border-success/20'
                    : 'bg-danger/10 border-danger/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  {booking.paymentProof?.status === VerificationStatus.Verified ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-success">
                          {t('paymentProof.paymentVerified')}
                        </p>
                        <p className="text-sm text-success/80">
                          {t('paymentProof.verifiedBody')}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-danger">
                          {t('paymentProof.paymentRejected')}
                        </p>
                        {booking.paymentProof?.rejectionReason && (
                          <p className="text-sm text-danger/80 mt-1">
                            <span className="font-medium">{t('paymentProof.reasonLabel')}</span> {booking.paymentProof.rejectionReason}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Booking Details Card */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    {t('paymentProof.traveler')}
                  </p>
                  <p className="font-semibold text-foreground">{travelerName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    {t('paymentProof.trip')}
                  </p>
                  <p className="font-semibold text-foreground">{tripTitle}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                      {t('paymentProof.amount')}
                    </p>
                    <p className="font-bold text-lg text-accent">
                      {formatCurrency(booking.totalAmount, booking.currency, i18n.language)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                      {t('paymentProof.bookingId')}
                    </p>
                    <p className="font-mono text-sm text-foreground">{booking.id}</p>
                  </div>
                </div>
              </div>

              {/* Payment Proof Display */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent" />
                  {t('paymentProof.proofTitle')}
                </h3>

                <div className="relative border-2 border-border rounded-lg overflow-hidden bg-muted/50">
                  {!proofUrl ? (
                    <div className="h-96 flex items-center justify-center">
                      <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">{t('paymentProof.noProof')}</p>
                      </div>
                    </div>
                  ) : imageError ? (
                    <div className="h-96 flex items-center justify-center">
                      <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-danger mx-auto mb-2" />
                        <p className="text-muted-foreground mb-4">{t('paymentProof.loadFailed')}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setImageError(false);
                            setImageLoading(true);
                          }}
                        >
                          {t('paymentProof.retry')}
                        </Button>
                      </div>
                    </div>
                  ) : fileType === 'pdf' ? (
                    <>
                      {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                          <Loader className="h-8 w-8 text-muted-foreground animate-spin" />
                        </div>
                      )}
                      <iframe
                        src={proofUrl}
                        title={t('paymentProof.proofTitle')}
                        className="w-full h-96"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                      />
                    </>
                  ) : (
                    <>
                      {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                          <Loader className="h-8 w-8 text-muted-foreground animate-spin" />
                        </div>
                      )}
                      <Image
                        src={proofUrl}
                        alt={t('paymentProof.proofAlt')}
                        className="w-full h-auto max-h-96 object-contain"
                        width={1200}
                        height={900}
                        unoptimized
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Rejection Reason Input */}
              {showRejectInput && !isReadOnly && (
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
                        setRejectionReason(e.target.value.slice(0, 500));
                        setRejectionError('');
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
                        onClick={() => {
                          setShowRejectInput(false);
                          setRejectionReason('');
                        }}
                        disabled={isLoading}
                      >
                        {t('paymentProof.cancel')}
                      </Button>
                      <Button
                        onClick={() => setShowRejectConfirm(true)}
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
                          onClick={() => setShowRejectConfirm(false)}
                          disabled={isLoading}
                        >
                          {t('paymentProof.back')}
                        </Button>
                        <Button
                          onClick={handleRejectConfirm}
                          disabled={isLoading}
                          className="bg-danger text-danger-foreground hover:bg-danger/90 flex-1"
                        >
                          {isLoading ? t('paymentProof.rejecting') : t('paymentProof.confirmRejection')}
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer Actions */}
            {!isReadOnly && (
              <div className="sticky bottom-0 bg-card border-t border-border p-6 flex gap-3 justify-end">
                <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                  {t('paymentProof.close')}
                </Button>
                <Button
                  onClick={handleRejectClick}
                  disabled={isLoading || showRejectInput}
                  variant="outline"
                  className="text-danger hover:bg-danger/10 hover:text-danger border-danger/20"
                >
                  {showRejectInput ? t('paymentProof.enteringReason') : t('paymentProof.rejectPayment')}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isLoading || showRejectInput}
                  className="bg-success text-success-foreground hover:bg-success/90"
                >
                  {isLoading ? t('paymentProof.approving') : t('paymentProof.approvePayment')}
                </Button>
              </div>
            )}

            {/* Read-only Footer */}
            {isReadOnly && (
              <div className="sticky bottom-0 bg-card border-t border-border p-6 flex justify-end">
                <Button variant="outline" onClick={handleClose}>
                  {t('paymentProof.close')}
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
