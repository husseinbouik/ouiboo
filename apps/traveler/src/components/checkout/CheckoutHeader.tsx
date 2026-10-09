'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@ouiboo/ui';
import { ChevronLeft, Lock } from 'lucide-react';

export function CheckoutHeader() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-4 mb-12">
      <Button variant="ghost" onClick={() => router.back()} className="rounded-xl h-12 w-12 p-0">
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <div>
        <h1 className="text-4xl font-black font-display tracking-tight">Checkout</h1>
        <p className="text-muted-foreground font-medium flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" /> Secure Manual Payment Process
        </p>
      </div>
    </div>
  );
}
