'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { CURRENT_BOOKING_TERMS_VERSION } from '@ouiboo/types';

type CheckoutTermsAcceptanceProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/**
 * B9 (Council Session #2, #481): explicit terms acceptance. An
 * unchecked-by-default checkbox that gates the booking submit — the
 * traveller must actively accept the terms version shown (linked in
 * full) before a booking can be created. The API requires the same
 * signal: termsAccepted: true plus the allowlisted version.
 */
export function CheckoutTermsAcceptance({ checked, onChange }: CheckoutTermsAcceptanceProps) {
  const { t } = useTranslation();

  return (
    <div className="p-8 bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 flex gap-4 items-start">
      <input
        id="checkout-terms-accept"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-ocean-500"
      />
      <p className="text-sm font-medium leading-relaxed">
        <label htmlFor="checkout-terms-accept" className="cursor-pointer">
          {t('checkout.termsAccept', { version: CURRENT_BOOKING_TERMS_VERSION })}
        </label>{' '}
        <Link
          href="/terms"
          target="_blank"
          rel="noreferrer"
          className="font-black underline underline-offset-2"
        >
          {t('checkout.termsReadLink')}
        </Link>
      </p>
    </div>
  );
}
