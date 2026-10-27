'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@ouiboo/ui';

/**
 * #566: honest "not in beta" state for agency money surfaces that do not
 * exist in the completely free closed beta (subscription billing,
 * platform-fee invoices, wallet/credits). It states plainly what the
 * beta does instead: no Ouiboo fee or subscription, and traveller
 * payments go directly to the agency — Ouiboo holds no money and there
 * is no Ouiboo balance.
 */
export function BetaNotAvailable({ variant }: { variant: 'billing' | 'wallet' }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12" data-testid="beta-not-available">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('betaNotAvailable.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('betaNotAvailable.subtitle')}</p>
      </div>
      <Card className="border-none shadow-sm bg-card border border-border">
        <CardContent className="p-6 space-y-4">
          <p className="text-sm font-semibold text-foreground">
            {t(variant === 'billing' ? 'betaNotAvailable.billingTitle' : 'betaNotAvailable.walletTitle')}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">{t('betaNotAvailable.body')}</p>
          <p className="text-sm leading-6 text-muted-foreground">{t('betaNotAvailable.paymentsNote')}</p>
          <Link
            href={variant === 'billing' ? '/dashboard/wallet' : '/dashboard/bookings'}
            className="inline-flex text-sm font-bold text-primary hover:underline"
          >
            {t(variant === 'billing' ? 'betaNotAvailable.viewPayments' : 'betaNotAvailable.viewBookings')}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
