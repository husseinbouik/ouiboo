'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle, Hourglass } from 'lucide-react';
import { VerificationStatus, type BookingDetails } from '@ouiboo/types';

interface PaymentProofStatusBannerProps {
  booking: BookingDetails;
}

/**
 * #422 (Council P0-20): three honest states. VERIFIED now means the bank
 * receipt was confirmed (never just "the image was approved"); ACCEPTED
 * is the intermediate state — proof accepted, payment NOT settled yet.
 */
export function PaymentProofStatusBanner({ booking }: PaymentProofStatusBannerProps) {
  const { t } = useTranslation();
  const status = booking.paymentProof?.status;

  if (status === VerificationStatus.Accepted) {
    return (
      <div className="px-6 py-4 border-b bg-warning/10 border-warning/20">
        <div className="flex items-start gap-3">
          <Hourglass className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-warning">
              {t('paymentProof.proofAccepted')}
            </p>
            <p className="text-sm text-warning/80">
              {t('paymentProof.acceptedBody')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`px-6 py-4 border-b ${
        status === VerificationStatus.Verified
          ? 'bg-success/10 border-success/20'
          : 'bg-danger/10 border-danger/20'
      }`}
    >
      <div className="flex items-start gap-3">
        {status === VerificationStatus.Verified ? (
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
  );
}
