'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@ouiboo/ui';
import { ChevronLeft, Lock } from 'lucide-react';
import { cn } from '@ouiboo/ui/utils';

const STEPS = [
  { label: 'Guest details', current: true },
  { label: 'Payment', current: true },
  { label: 'Confirmation', current: false },
];

export function CheckoutHeader() {
  const router = useRouter();

  return (
    <div className="mb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="rounded-xl h-12 w-12 p-0" aria-label="Go back">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-4xl font-black font-display tracking-tight">Checkout</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" /> Secure Manual Payment Process
          </p>
        </div>
      </div>

      {/* Connected step indicator (#330): the steps read as one path with a
          clear next step. This page covers steps 1-2; confirmation follows
          once the booking is placed. */}
      <ol className="mt-10 flex items-center" aria-label="Checkout progress">
        {STEPS.map((step, index) => (
          <li
            key={step.label}
            className={cn('flex items-center', index < STEPS.length - 1 && 'flex-1')}
          >
            <div className="flex items-center gap-3">
              <span
                aria-current={index === 1 ? 'step' : undefined}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black',
                  step.current ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  'text-sm font-bold',
                  step.current ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className="mx-4 h-px flex-1 bg-border" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
