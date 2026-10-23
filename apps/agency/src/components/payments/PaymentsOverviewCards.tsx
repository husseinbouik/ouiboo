'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Badge } from '@ouiboo/ui';
import { Landmark, Clock, Undo2 } from 'lucide-react';
import { formatCurrency } from '@ouiboo/utils';

type PaymentsOverviewCardsProps = {
  totalReceived: number;
  totalRefunded: number;
  pendingVerificationAmount: number;
  pendingVerificationCount: number;
  currency: string;
  language: string;
};

/**
 * #368: traveller payments are settled directly to the agency (or its
 * payment provider). These cards report recorded payment facts — there is
 * no OuiBoo balance and nothing to withdraw from OuiBoo.
 */
export function PaymentsOverviewCards({
  totalReceived,
  totalRefunded,
  pendingVerificationAmount,
  pendingVerificationCount,
  currency,
  language,
}: PaymentsOverviewCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Received by the agency's merchant account */}
      <Card className="border-none shadow-lg bg-primary text-primary-foreground relative overflow-hidden">
        <CardContent className="p-8 space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="bg-primary-foreground/10 p-2 rounded-lg text-primary-foreground">
              <Landmark className="h-6 w-6" />
            </div>
            <Badge variant="success" className="bg-success/20 border-success/30 font-bold uppercase text-[10px]">{t('payments.receivedBadge')}</Badge>
          </div>
          <div>
            <p className="text-primary-foreground/80 text-xs font-bold uppercase tracking-wider">{t('payments.received')}</p>
            <h2 className="text-4xl font-black mt-1">
              {formatCurrency(totalReceived, currency, language)}
            </h2>
            <p className="text-primary-foreground/70 text-xs font-medium mt-2">{t('payments.receivedHint')}</p>
          </div>
        </CardContent>
        <div className="absolute -bottom-12 -end-12 w-48 h-48 bg-accent/10 rounded-full blur-3xl"></div>
      </Card>

      {/* Awaiting verification */}
      <Card className="border-none shadow-sm bg-card border border-border">
        <CardContent className="p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="bg-warning/10 p-2 rounded-lg text-warning">
              <Clock className="h-6 w-6" />
            </div>
            <Badge variant="outline" className="font-bold uppercase text-[10px]">{t('payments.pendingCount', { count: pendingVerificationCount })}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">{t('payments.pending')}</p>
            <h2 className="text-4xl font-black mt-1 text-foreground">
              {formatCurrency(pendingVerificationAmount, currency, language)}
            </h2>
            <p className="text-muted-foreground text-xs font-medium mt-2">{t('payments.pendingHint')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Refunded */}
      <Card className="border-none shadow-sm bg-card border border-border">
        <CardContent className="p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <Undo2 className="h-6 w-6" />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">{t('payments.refunded')}</p>
            <h2 className="text-4xl font-black mt-1 text-foreground">
              {formatCurrency(totalRefunded, currency, language)}
            </h2>
            <p className="text-muted-foreground text-xs font-medium mt-2">{t('payments.refundedHint')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
