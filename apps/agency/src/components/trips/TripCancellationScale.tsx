import { Plus, ShieldCheck, X } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@ouiboo/ui';
import { PLATFORM_DEFAULT_CANCELLATION_BANDS } from '@ouiboo/schemas';
import type { TFunction } from 'i18next';
import type { TripWizardFormApi } from './useTripWizardForm';

type Props = {
  t: TFunction;
  form: TripWizardFormApi;
};

type Band = { minDaysBeforeStart: number; refundPercent: number };

/**
 * #417 (Council P0-11) — wizard step 4: the trip's cancellation scale.
 *
 * The value stays `undefined` while the trip uses the platform default
 * scale, so the defaults are never frozen into a trip as if they were
 * agency-chosen bands. Customizing starts from a copy of the defaults;
 * the API validates the bands again on save (coverage down to 0 days,
 * no duplicate thresholds) and the platform floor — agency fault or
 * minimum group not reached = 100% refund — always applies on top and
 * cannot be edited here.
 */
export function TripCancellationScale({ t, form }: Props) {
  const { register, watch, setValue, errors } = form;
  const policy = watch('cancellationPolicy');
  const bands: Band[] = policy?.bands ?? [];
  const customized = bands.length > 0;

  const setBands = (next: Band[]) => {
    setValue('cancellationPolicy', next.length > 0 ? { bands: next } : undefined, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const removeBand = (index: number) => {
    setBands(bands.filter((_, i) => i !== index));
  };

  const bandsError = errors.cancellationPolicy?.bands as
    | { message?: string; root?: { message?: string } }
    | undefined;
  const bandsErrorMessage = bandsError?.root?.message ?? bandsError?.message;

  const defaultBandLine = (band: Band, index: number, all: Band[]) => {
    if (index < all.length - 1) {
      return t('trips.create.cancellationBandAtLeast', {
        days: band.minDaysBeforeStart,
        percent: band.refundPercent,
      });
    }
    return t('trips.create.cancellationBandLessThan', {
      days: all.length > 1 ? all[all.length - 2].minDaysBeforeStart : band.minDaysBeforeStart,
      percent: band.refundPercent,
    });
  };

  return (
    <Card className="border border-border shadow-sm bg-card">
      <header className="p-6 border-b border-border flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">{t('trips.create.cancellationTitle')}</h3>
          <p className="text-xs text-muted-foreground">{t('trips.create.cancellationSubtitle')}</p>
        </div>
      </header>
      <CardContent className="p-6 space-y-4">
        <p className="text-xs text-muted-foreground rounded-xl bg-muted/40 p-3">
          {t('trips.create.cancellationFloorNote')}
        </p>

        {!customized ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              {t('trips.create.cancellationDefaultNote')}
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {PLATFORM_DEFAULT_CANCELLATION_BANDS.map((band, index) => (
                <li key={band.minDaysBeforeStart}>
                  {defaultBandLine(band, index, [...PLATFORM_DEFAULT_CANCELLATION_BANDS])}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-dashed"
              onClick={() =>
                setBands(PLATFORM_DEFAULT_CANCELLATION_BANDS.map((band) => ({ ...band })))
              }
            >
              {t('trips.create.cancellationCustomize')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {bands.map((band, index) => (
              <div key={index} className="flex flex-wrap items-end gap-2">
                <label className="flex-1 min-w-[140px] space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('trips.create.cancellationDaysLabel')}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    {...register(`cancellationPolicy.bands.${index}.minDaysBeforeStart`, {
                      valueAsNumber: true,
                    })}
                  />
                </label>
                <label className="flex-1 min-w-[120px] space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('trips.create.cancellationPercentLabel')}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    {...register(`cancellationPolicy.bands.${index}.refundPercent`, {
                      valueAsNumber: true,
                    })}
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('trips.create.cancellationRemoveBand')}
                  onClick={() => removeBand(index)}
                  className="text-danger hover:bg-danger/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {bandsErrorMessage && (
              <p className="text-xs font-semibold text-danger">{bandsErrorMessage}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBands([...bands, { minDaysBeforeStart: 0, refundPercent: 0 }])}
                className="border-dashed"
              >
                <Plus className="h-4 w-4 me-2" /> {t('trips.create.cancellationAddBand')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setBands([])}
              >
                {t('trips.create.cancellationReset')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
