'use client';

import React from 'react';
import { Info } from 'lucide-react';

export function CheckoutDisclaimer() {
  return (
    <div className="p-8 bg-ocean-500/10 rounded-[2.5rem] border border-ocean-500/20 flex gap-6">
      <div className="w-12 h-12 rounded-2xl bg-ocean-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-ocean-500/20"><Info className="h-6 w-6" /></div>
      <div className="space-y-1">
        <h4 className="font-black text-blue-900 dark:text-blue-200 uppercase text-[10px] tracking-widest">Important Disclaimer</h4>
        <p className="text-sm text-ocean-700 dark:text-ocean-300 dark:text-blue-300 font-medium leading-relaxed">Your booking will be marked as &quot;Pending Verification&quot; until the agency confirms receipt of your payment manually. This usually takes 2-4 business hours.</p>
      </div>
    </div>
  );
}
