'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { VerificationStatus, type BookingDetails } from '@ouiboo/types';

interface PaymentProofStatusBannerProps {
  booking: BookingDetails;
}

export function PaymentProofStatusBanner({ booking }: PaymentProofStatusBannerProps) {
  const { t } = useTranslation();

  return (
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
  );
}
