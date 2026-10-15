'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { BookingDetails } from '@ouiboo/types';

interface PaymentProofBookingCardProps {
  booking: BookingDetails;
  tripTitle: string;
  travelerName: string;
  amountText: string;
}

export function PaymentProofBookingCard({
  booking,
  tripTitle,
  travelerName,
  amountText,
}: PaymentProofBookingCardProps) {
  const { t } = useTranslation();

  return (
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
          <p className="font-bold text-lg text-accent">{amountText}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            {t('paymentProof.bookingId')}
          </p>
          <p className="font-mono text-sm text-foreground">{booking.id}</p>
        </div>
      </div>
    </div>
  );
}
