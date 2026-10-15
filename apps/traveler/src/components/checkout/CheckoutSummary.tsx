'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, Button, Badge } from '@ouiboo/ui';
import { MapPin, Calendar, Users, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@ouiboo/utils';
import type { CheckoutTrip } from './checkout-types';

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
}: CheckoutSummaryProps) {
  return (
    <Card className="border-none shadow-2xl shadow-black/10 rounded-[3rem] overflow-hidden p-10 space-y-8 bg-card ring-1 ring-border/50">
      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="h-20 w-20 rounded-2xl overflow-hidden shrink-0 shadow-lg">
            <Image src={trip.images?.[0] || 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?q=80&w=1200&auto=format&fit=crop'} className="w-full h-full object-cover" alt={trip.title} width={80} height={80} />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-lg leading-tight line-clamp-2">{trip.title}</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <MapPin className="h-3 w-3 text-sunset-orange" /> {trip.startLocation}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-border/50">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> Selected Date</span>
            <span className="font-black">{sessionDateLabel}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Guest Count</span>
            <span className="font-black">{guestCount} Traveler{guestCount > 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-border/50">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Subtotal</span>
            <span className="font-bold">{formatCurrency(totalPrice, selectedCurrency, language)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Service Fee</span>
            <Badge variant="outline" className="border-emerald-500/30 text-success bg-success/10 font-black text-[8px] uppercase tracking-widest">Free</Badge>
          </div>
          <div className="flex justify-between items-end pt-4 border-t border-border/50">
            <span className="text-lg font-black font-display tracking-tight text-foreground">Total to pay</span>
            <div className="text-right">
              <span className="text-3xl font-black font-display text-primary tracking-tighter leading-none block">{formatCurrency(totalPrice, selectedCurrency, language)}</span>
            </div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-xs font-semibold text-rose-700">
          {errorMessage}
        </div>
      )}

      <Button
        disabled={!canSubmit || isSubmitting}
        onClick={onSubmit}
        className="w-full h-20 rounded-[2rem] text-xl font-black bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 border-none group px-10"
      >
        {isSubmitting ? 'Submitting booking...' : 'Complete Booking'} <CheckCircle2 className="h-6 w-6 ml-4 group-hover:scale-110 transition-transform" />
      </Button>

      <div className="flex items-center justify-center gap-4 pt-4 opacity-50">
        <ShieldCheck className="h-5 w-5" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Moroccan Tourism Protection</span>
      </div>
    </Card>
  );
}
