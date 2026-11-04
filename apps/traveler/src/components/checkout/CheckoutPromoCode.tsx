'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Label } from '@ouiboo/ui';
import { TicketPercent, X } from 'lucide-react';
import type { PromoPreview } from './checkout-types';

type CheckoutPromoCodeProps = {
  appliedPromo: PromoPreview | null;
  isApplying: boolean;
  error: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
};

/**
 * #778 (Council S6 Phase 3): agency-funded promo code entry at
 * checkout. The code is validated + priced by the API preview; the
 * booking itself re-validates it server-side, so what is applied here
 * is exactly what the booking charges.
 */
export function CheckoutPromoCode({ appliedPromo, isApplying, error, onApply, onRemove }: CheckoutPromoCodeProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');

  if (appliedPromo) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 p-5 text-sm" data-testid="checkout-promo-applied">
        <div className="flex items-center justify-between gap-4">
          <p className="font-bold text-foreground flex items-center gap-2">
            <TicketPercent className="h-4 w-4 text-emerald-600" />
            {t('checkout.promo.applied', { code: appliedPromo.code })}
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
            aria-label={t('checkout.promo.remove')}
          >
            <X className="h-3.5 w-3.5" /> {t('checkout.promo.remove')}
          </button>
        </div>
        <p className="mt-1 text-muted-foreground">{t('checkout.promo.fundedNote')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="checkout-promo-entry">
      <Label htmlFor="checkout-promo-code" className="flex items-center gap-2">
        <TicketPercent className="h-4 w-4" /> {t('checkout.promo.label')}
      </Label>
      <div className="flex gap-3">
        <Input
          id="checkout-promo-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('checkout.promo.placeholder')}
          maxLength={64}
          autoComplete="off"
          className="uppercase"
        />
        <Button
          type="button"
          variant="outline"
          disabled={!code.trim() || isApplying}
          onClick={() => onApply(code.trim())}
        >
          {isApplying ? t('checkout.promo.applying') : t('checkout.promo.apply')}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>
      )}
    </div>
  );
}
