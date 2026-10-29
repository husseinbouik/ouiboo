'use client';

import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Card, CardContent, Button, Badge } from '@ouiboo/ui';
import { MapPin, Calendar, Users, Banknote, CheckCircle2 } from 'lucide-react';
import { formatCurrency, normalizeCurrency } from '@ouiboo/utils';
import type { CheckoutTrip } from './checkout-types';
import SellerIdentity from '../SellerIdentity';
import { CancellationScaleCard } from '../CancellationScaleCard';
import { useDisplayAmountConverter } from '@/lib/display-currency';

type CheckoutSummaryProps = {
  trip: CheckoutTrip;
  sessionDateLabel: string;
  guestCount: number;
  totalPrice: number;
  selectedCurrency: string | undefined;
  language: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  /** #369: staged amounts when the session is a minimum-group trip. */
  stagedAmounts?: { depositDue: number; balanceDue: number; total: number } | null;
};

export function CheckoutSummary({
  trip,
  sessionDateLabel,
  guestCount,
  totalPrice,
  selectedCurrency,
  language,
  errorMessage,
  isSubmitting,
  canSubmit,
  onSubmit,
  stagedAmounts,
}: CheckoutSummaryProps) {
  const { t } = useTranslation();
  // #619: render every amount in the traveller's display currency, like
  // the trip page (#498/#615) does. Conversion is display-only — the
  // charge itself stays in the session currency, and when no rate is
  // available the converter falls back to that authoritative currency.
  const convertAmount = useDisplayAmountConverter(selectedCurrency);
  const displayAmount = (amount: number): { amount: number; currency: string } =>
    convertAmount(amount) ?? { amount, currency: normalizeCurrency(selectedCurrency) };
  const formatDisplayAmount = (amount: number): string => {
    const converted = displayAmount(amount);
    return formatCurrency(converted.amount, converted.currency, language);
  };
  const totalDisplay = displayAmount(totalPrice);
  const showsConvertedCurrency =
    normalizeCurrency(selectedCurrency) !== '' &&
    totalDisplay.currency !== normalizeCurrency(selectedCurrency);
  return (
    <Card className="border-none shadow-2xl shadow-black/10 rounded-[3rem] overflow-hidden p-10 space-y-8 bg-card ring-1 ring-border/50">
      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="h-20 w-20 rounded-2xl overflow-hidden shrink-0 shadow-lg">
            <Image src={trip.images?.[0] || 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?q=80&w=1200&auto=format&fit=crop'} className="w-full h-full object-cover" alt={trip.imageAlts?.[0]?.trim() || trip.title} width={80} height={80} />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-lg leading-tight line-clamp-2">{trip.title}</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <MapPin className="h-3 w-3 text-sunset-orange" /> {trip.startLocation}
            </div>
            {/* #371: seller of record + verified travel licence */}
            <SellerIdentity agency={trip.agency} className="pt-1 normal-case tracking-normal" />
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-border/50">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> {t('checkout.selectedDate')}</span>
            <span className="font-black">{sessionDateLabel}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium flex items-center gap-2"><Users className="h-4 w-4" /> {t('checkout.guestCount')}</span>
            <span className="font-black">{guestCount}</span>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-border/50">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">{t('checkout.subtotal')}</span>
            <span className="oui-numeric font-bold">{formatDisplayAmount(totalPrice)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">{t('checkout.serviceFee')}</span>
            <Badge variant="outline" className="border-emerald-500/30 text-success-dark bg-success/10 font-black text-[8px] uppercase tracking-widest">{t('checkout.free')}</Badge>
          </div>
          {stagedAmounts ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">{t('checkout.balanceAfterConfirmation')}</span>
                <span className="oui-numeric font-bold">{formatDisplayAmount(stagedAmounts.balanceDue)}</span>
              </div>
              <div className="flex justify-between items-end pt-4 border-t border-border/50">
                <span className="text-lg font-black font-display tracking-tight text-foreground">{t('checkout.depositToPayNow')}</span>
                <div className="text-end">
                  <span className="oui-numeric text-3xl font-black font-display text-primary tracking-tighter leading-none block">{formatDisplayAmount(stagedAmounts.depositDue)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-end pt-4 border-t border-border/50">
              <span className="text-lg font-black font-display tracking-tight text-foreground">{t('checkout.totalToPay')}</span>
              <div className="text-end">
                <span className="oui-numeric text-3xl font-black font-display text-primary tracking-tighter leading-none block">{formatDisplayAmount(totalPrice)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* #417: the cancellation scale, repeated at checkout before payment. */}
      <CancellationScaleCard
        scale={trip.cancellationScale}
        baseAmount={totalDisplay.amount}
        currency={totalDisplay.currency}
      />

      {/* #619: when the amounts render in a different currency than the
          session is charged in, say so — the conversion is display-only.
          #655: the note renders at 12px (was 10px) with the currency
          codes bidi-isolated; the same note also sits adjacent to the
          transfer instruction in CheckoutPayment. */}
      {showsConvertedCurrency && (
        <p className="text-xs font-semibold text-muted-foreground text-center">
          <Trans
            i18nKey="checkout.displayCurrencyNote"
            values={{
              display: totalDisplay.currency,
              charged: normalizeCurrency(selectedCurrency),
            }}
            components={{ display: <bdi />, charged: <bdi /> }}
          />
        </p>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-xs font-semibold text-rose-700">
          {errorMessage}
        </div>
      )}

      <Button
        disabled={!canSubmit || isSubmitting}
        onClick={onSubmit}
        className="w-full h-20 rounded-3xl text-xl font-black bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 border-none group px-10"
      >
        {isSubmitting ? t('checkout.submitting') : t('checkout.completeBooking')} <CheckCircle2 className="h-6 w-6 ms-4 group-hover:scale-110 transition-transform" />
      </Button>

      {/* No opacity on this row (#332): opacity-50 dropped the muted
          text to ~2.1:1 contrast; the plain muted-foreground is AA. */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <Banknote className="h-5 w-5" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('checkout.directPaymentNote')}</span>
      </div>
    </Card>
  );
}
