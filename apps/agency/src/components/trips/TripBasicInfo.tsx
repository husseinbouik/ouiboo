import { Input, Card, CardContent } from '@ouiboo/ui';
import type { TFunction } from 'i18next';
import type { TripWizardFormApi } from './useTripWizardForm';

type Props = {
  t: TFunction;
  form: TripWizardFormApi;
};

/** Wizard step 1 — trip basics: title, description, category, locations, duration, currency. */
export function TripBasicInfo({ t, form }: Props) {
  const { register, errors } = form;

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      <Card className="border border-border shadow-sm bg-card">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">{t('trips.create.title')}</label>
            <Input {...register('title')} placeholder={t('trips.create.titlePlaceholder')} className="h-12" />
            {errors.title && <p className="text-danger text-xs font-medium">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">{t('trips.create.description')}</label>
            <textarea
              {...register('description')}
              className="w-full h-32 p-4 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
              placeholder={t('trips.create.descriptionPlaceholder')}
            ></textarea>
            {errors.description && <p className="text-danger text-xs font-medium">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">{t('trips.create.category')}</label>
              <select {...register('category')} className="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm focus:outline-none text-foreground">
                <option value="ADVENTURE">{t('trips.create.categoryAdventure')}</option>
                <option value="CULTURAL">{t('trips.create.categoryCultural')}</option>
                <option value="LUXURY">{t('trips.create.categoryLuxury')}</option>
                <option value="BUDGET">{t('trips.create.categoryBudget')}</option>
                <option value="NATURE">{t('trips.create.categoryNature')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">{t('trips.create.startingLocation')}</label>
              <Input {...register('startLocation')} placeholder={t('trips.create.startingLocationPlaceholder')} className="h-12" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">{t('trips.create.endLocation')}</label>
              <Input {...register('endLocation')} placeholder={t('trips.create.endLocationPlaceholder')} className="h-12" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">{t('trips.create.days')}</label>
              <Input type="number" {...register('durationDays', { valueAsNumber: true })} className="h-12" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">{t('trips.create.nights')}</label>
              <Input type="number" {...register('durationNights', { valueAsNumber: true })} className="h-12" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">{t('trips.create.currency')}</label>
              <Input
                maxLength={3}
                {...register('currency', { setValueAs: (value) => String(value).trim().toUpperCase() })}
                placeholder={t('trips.create.currencyPlaceholder')}
                className="h-12 uppercase"
              />
              {errors.currency && <p className="text-danger text-xs font-medium">{errors.currency.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
