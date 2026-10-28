'use client';

import React from 'react';
import { Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';
import { useDisplayCurrency } from '@/lib/display-currency';

/**
 * #498 rework: the display-currency control. Options come from
 * GET /currency/supported (via the display-currency context); the
 * value is the signed-in profile's displayCurrency or, for guests,
 * the locally persisted preference. Rendering-only — checkout keeps
 * charging the trip's own currency.
 */
export function CurrencySelector({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { displayCurrency, supportedCurrencies, setDisplayCurrency } = useDisplayCurrency();

  return (
    <label
      className={cn(
        'flex items-center gap-1.5 px-2.5 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all',
        className,
      )}
    >
      <Coins className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{t('nav.displayCurrency')}</span>
      <select
        aria-label={t('nav.displayCurrency')}
        value={displayCurrency}
        onChange={(event) => {
          void setDisplayCurrency(event.target.value);
        }}
        className="bg-transparent text-[11px] font-black tracking-tighter uppercase outline-none cursor-pointer"
      >
        {supportedCurrencies.map((currency) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
    </label>
  );
}
