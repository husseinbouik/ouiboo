'use client';

import React from 'react';
import { Input, Label, RadioGroup, RadioGroupItem, Badge } from '@ouiboo/ui';
import { Smartphone } from 'lucide-react';
import { cn } from '@ouiboo/ui/utils';
import { formatCurrency } from '@ouiboo/utils';
import type { CheckoutTripSession } from './checkout-types';
import type { BookingDetails } from '@ouiboo/types';

type CheckoutGuestFormProps = {
  trip: { sessions?: CheckoutTripSession[] };
  retryBooking?: BookingDetails | null;
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  guestCount: number;
  onGuestCountChange: (count: number) => void;
  fullName: string;
  onFullNameChange: (value: string) => void;
  phoneNumber: string;
  onPhoneNumberChange: (value: string) => void;
  language: string;
};

export function CheckoutGuestForm({
  trip,
  retryBooking,
  selectedSessionId,
  onSelectSession,
  guestCount,
  onGuestCountChange,
  fullName,
  onFullNameChange,
  phoneNumber,
  onPhoneNumberChange,
  language,
}: CheckoutGuestFormProps) {
  return (
    <div className="space-y-6">
      {retryBooking && (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Retry payment</p>
          <p className="mt-2 text-sm font-semibold text-amber-900">
            We restored your last booking details from reference {retryBooking.id.slice(0, 8)} so you can retry payment without re-entering everything.
          </p>
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-black">1</div>
        <h2 className="text-2xl font-black font-display">Guest Details</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Session</Label>
          <RadioGroup
            value={selectedSessionId || ''}
            onValueChange={onSelectSession}
            className="mt-3 grid grid-cols-1 gap-3"
          >
            {trip.sessions?.length ? trip.sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  "flex items-center justify-between rounded-2xl border p-4 text-sm font-semibold transition-all",
                  selectedSessionId === session.id ? "border-primary bg-primary/5" : "border-border/50 hover:bg-muted/40"
                )}
              >
                <div>
                  <p className="font-black">{new Date(session.startDate).toLocaleDateString()} - {new Date(session.endDate).toLocaleDateString()}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{session.availableSeats} seats left</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] font-black">{formatCurrency(session.price, session.currency, language)}</Badge>
                  <RadioGroupItem
                    value={session.id}
                    aria-label={`${new Date(session.startDate).toLocaleDateString()} - ${new Date(session.endDate).toLocaleDateString()}, ${session.availableSeats} seats left`}
                  />
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                No upcoming sessions are available yet.
              </div>
            )}
          </RadioGroup>
        </div>
        <div>
          <Label htmlFor="guest-count" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Guest Count</Label>
          <Input
            id="guest-count"
            type="number"
            min={1}
            value={guestCount}
            onChange={(e) => onGuestCountChange(Math.max(1, Number(e.target.value)))}
            className="mt-3 h-14 rounded-2xl bg-muted/30 border-none font-bold text-lg text-center"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="full-name" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Full Name</Label>
          <Input
            id="full-name"
            name="name"
            autoComplete="name"
            placeholder="Abderrahmane..."
            className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-lg"
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone-number" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Phone Number</Label>
          <div className="relative">
            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="phone-number"
              type="tel"
              name="tel"
              autoComplete="tel"
              placeholder="Include country code"
              className="h-14 pl-12 rounded-2xl bg-muted/30 border-none font-bold text-lg"
              value={phoneNumber}
              onChange={(e) => onPhoneNumberChange(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs font-semibold text-muted-foreground md:col-span-2">
          We never ask for your ID number online. The agency may check your ID at departure, so please bring it with you.
        </p>
      </div>
    </div>
  );
}
