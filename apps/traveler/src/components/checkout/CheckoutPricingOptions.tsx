'use client';

import { useTranslation } from 'react-i18next';
import type { CheckoutTrip, PricingSelectionState } from './checkout-types';

/**
 * #695 (Council S6): variant (option tier) + paid add-on selection at
 * checkout. Names are language-keyed maps resolved in the traveller's
 * language (French fallback, like trip content). Prices are the
 * agency's own; Ouiboo adds nothing on top.
 */
export function localizedName(name: Record<string, string> | undefined, language: string): string {
  if (!name) return '';
  const code = (language || 'fr').split('-')[0];
  return name[code] ?? name.fr ?? Object.values(name)[0] ?? '';
}

export function CheckoutPricingOptions({
  trip,
  selection,
  onChange,
  language,
}: {
  trip: CheckoutTrip;
  selection: PricingSelectionState;
  onChange: (next: PricingSelectionState) => void;
  language: string;
}) {
  const { t } = useTranslation();
  const variants = trip.pricingVariants ?? [];
  const addOns = trip.addOns ?? [];
  if (variants.length === 0 && addOns.length === 0) return null;

  const unitLabel = (unit: string) =>
    unit === 'PER_GROUP'
      ? t('checkout.pricing.perGroup')
      : unit === 'PER_VEHICLE'
        ? t('checkout.pricing.perVehicle')
        : unit === 'PER_BOOKING'
          ? t('checkout.pricing.perBooking')
          : t('checkout.pricing.perPerson');

  return (
    <div className="space-y-6" data-testid="checkout-pricing-options">
      {variants.length > 0 && (
        <fieldset>
          <legend className="text-sm font-semibold">{t('checkout.pricing.variantsTitle')}</legend>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-3 rounded-xl border border-border p-3">
              <input
                type="radio"
                name="pricing-variant"
                checked={selection.variantId === null}
                onChange={() => onChange({ ...selection, variantId: null })}
              />
              <span className="text-sm">{t('checkout.pricing.standardOption')}</span>
            </label>
            {variants.map((variant) => (
              <label key={variant.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="pricing-variant"
                    checked={selection.variantId === variant.id}
                    onChange={() => onChange({ ...selection, variantId: variant.id })}
                  />
                  <span className="text-sm font-medium">{localizedName(variant.name, language)}</span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {Number(variant.price).toFixed(2)} {variant.currency} · {unitLabel(variant.pricingUnit)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {addOns.length > 0 && (
        <fieldset>
          <legend className="text-sm font-semibold">{t('checkout.pricing.addOnsTitle')}</legend>
          <div className="mt-2 space-y-2">
            {addOns.map((addOn) => {
              const qty = selection.addOns[addOn.id] ?? 0;
              return (
                <label key={addOn.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={qty > 0}
                      onChange={(e) =>
                        onChange({
                          ...selection,
                          addOns: { ...selection.addOns, [addOn.id]: e.target.checked ? 1 : 0 },
                        })
                      }
                    />
                    <span className="text-sm font-medium">{localizedName(addOn.name, language)}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    + {Number(addOn.price).toFixed(2)} {addOn.currency} · {unitLabel(addOn.pricingUnit)}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
