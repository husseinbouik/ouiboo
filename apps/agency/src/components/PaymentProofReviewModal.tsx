'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, FileText, Loader } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@ouiboo/ui';
import { VerificationStatus, type BookingDetails } from '@ouiboo/types';

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
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  if (!booking) return null;

  const hasFinalReviewStatus = booking.paymentProof?.status && booking.paymentProof.status !== VerificationStatus.Pending;
  const isReadOnly = readOnly || hasFinalReviewStatus;
  const tripTitle = booking.session.template.title || 'Trip';
  const travelerName = booking.fullName || booking.traveler?.name || 'Traveler';
  const proofUrl = booking.paymentProof?.imageUrl ? `/bookings/${booking.id}/payment-proof/download` : null;

  const handleClose = () => {
    setShowRejectInput(false);
    setRejectionReason('');
    setImageError(false);
    setImageLoading(true);
    setShowRejectConfirm(false);
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
      alert('Please enter a rejection reason');
      return;
    }
    if (rejectionReason.trim().length < 10) {
      alert('Rejection reason must be at least 10 characters');
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[101] overflow-hidden border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 p-6 flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-deep-blue dark:text-gray-100">
                  Review Payment Proof
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {isReadOnly
                    ? 'View-only payment proof inspection for agency operators'
                    : 'Review and approve or reject this payment proof'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Status Banner */}
            {isReadOnly && (
              <div
                className={`px-6 py-4 border-b ${
                  booking.paymentProof?.status === VerificationStatus.Verified
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30'
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {booking.paymentProof?.status === VerificationStatus.Verified ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-emerald-900 dark:text-emerald-300">
                          Payment Verified
                        </p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-400">
                          This payment has already been approved.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-rose-900 dark:text-rose-300">
                          Payment Rejected
                        </p>
                        {booking.paymentProof?.rejectionReason && (
                          <p className="text-sm text-rose-700 dark:text-rose-400 mt-1">
                            <span className="font-medium">Reason:</span> {booking.paymentProof.rejectionReason}
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
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Traveler
                  </p>
                  <p className="font-semibold text-deep-blue dark:text-gray-100">{travelerName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Trip
                  </p>
                  <p className="font-semibold text-deep-blue dark:text-gray-100">{tripTitle}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Amount
                    </p>
                    <p className="font-bold text-lg text-sunset-orange">
                      {booking.totalAmount} <span className="text-sm">MAD</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Booking ID
                    </p>
                    <p className="font-mono text-sm text-deep-blue dark:text-gray-100">{booking.id}</p>
                  </div>
                </div>
              </div>

              {/* Payment Proof Display */}
              <div className="space-y-3">
                <h3 className="font-semibold text-deep-blue dark:text-gray-100 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-sunset-orange" />
                  Payment Proof
                </h3>

                <div className="border-2 border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-slate-800/50">
                  {!proofUrl ? (
                    <div className="h-96 flex items-center justify-center">
                      <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No payment proof uploaded</p>
                      </div>
                    </div>
                  ) : imageError ? (
                    <div className="h-96 flex items-center justify-center">
                      <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400 mb-4">Failed to load payment proof</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setImageError(false);
                            setImageLoading(true);
                          }}
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  ) : fileType === 'pdf' ? (
                    <>
                      {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-slate-800/50 z-10">
                          <Loader className="h-8 w-8 text-gray-400 animate-spin" />
                        </div>
                      )}
                      <iframe
                        src={proofUrl}
                        className="w-full h-96"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                      />
                    </>
                  ) : (
                    <>
                      {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-slate-800/50 z-10">
                          <Loader className="h-8 w-8 text-gray-400 animate-spin" />
                        </div>
                      )}
                      <Image
                        src={proofUrl}
                        alt="Payment Proof"
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
                  className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-800"
                >
                  <div>
                    <label className="text-sm font-medium text-deep-blue dark:text-gray-100 flex items-center justify-between">
                      <span>Rejection Reason *</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {rejectionReason.length} / 500
                      </span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value.slice(0, 500))}
                      placeholder="Explain why this payment proof is being rejected..."
                      className="mt-2 w-full h-24 p-3 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sunset-orange"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Minimum 10 characters required
                    </p>
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
                        Cancel
                      </Button>
                      <Button
                        onClick={() => setShowRejectConfirm(true)}
                        disabled={isLoading || rejectionReason.trim().length < 10}
                        className="bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        Review Rejection
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-lg">
                      <p className="font-semibold text-rose-900 dark:text-rose-300">Confirm Rejection</p>
                      <p className="text-sm text-rose-800 dark:text-rose-400">
                        This payment will be marked as rejected and the traveler will be notified with the following reason:
                      </p>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded border border-rose-200 dark:border-rose-900/30 text-sm text-gray-700 dark:text-gray-300 italic">
                        &ldquo;{rejectionReason}&rdquo;
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowRejectConfirm(false)}
                          disabled={isLoading}
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleRejectConfirm}
                          disabled={isLoading}
                          className="bg-rose-600 hover:bg-rose-700 text-white flex-1"
                        >
                          {isLoading ? 'Rejecting...' : 'Confirm Rejection'}
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer Actions */}
            {!isReadOnly && (
              <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 p-6 flex gap-3 justify-end">
                <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                  Close
                </Button>
                <Button
                  onClick={handleRejectClick}
                  disabled={isLoading || showRejectInput}
                  variant="outline"
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200 dark:border-rose-900/30 dark:hover:bg-rose-950/20"
                >
                  {showRejectInput ? 'Entering Reason...' : 'Reject Payment'}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isLoading || showRejectInput}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isLoading ? 'Approving...' : 'Approve Payment'}
                </Button>
              </div>
            )}

            {/* Read-only Footer */}
            {isReadOnly && (
              <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 p-6 flex justify-end">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
