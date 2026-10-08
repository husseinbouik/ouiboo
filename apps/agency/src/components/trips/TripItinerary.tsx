import { Plus } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@ouiboo/ui';
import type { TFunction } from 'i18next';
import type { TripWizardFormApi } from './useTripWizardForm';

type Props = {
  t: TFunction;
  form: TripWizardFormApi;
};

/** Wizard step 2 — day-by-day itinerary builder. */
export function TripItinerary({ t, form }: Props) {
  const { register, errors, itineraryFields, appendDay } = form;

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-6">
        {itineraryFields.map((field, index) => (
          <Card key={field.id} className="border border-border shadow-sm bg-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-sm">{index + 1}</span>
                  {t('trips.create.dayN', { index: index + 1 })}
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">{t('trips.create.dayTitle')}</label>
                  <Input {...register(`itinerary.${index}.title`)} placeholder={t('trips.create.dayTitlePlaceholder')} className="h-12" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">{t('trips.create.dayDescription')}</label>
                  <textarea
                    {...register(`itinerary.${index}.description`)}
                    className="w-full h-24 p-4 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                    placeholder={t('trips.create.dayDescriptionPlaceholder')}
                  ></textarea>
                  <input type="hidden" {...register(`itinerary.${index}.dayNumber`, { valueAsNumber: true })} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {errors.itinerary && (
          <p className="text-danger text-sm font-medium p-4 bg-danger/10 border border-danger/30 rounded-xl">
            {t('trips.create.itineraryIncomplete')}
          </p>
        )}
        <Button type="button" variant="outline" onClick={() => appendDay({ dayNumber: itineraryFields.length + 1, title: '', description: '', activities: [] })} className="h-14 rounded-2xl border-dashed">
          <Plus className="h-5 w-5 me-2" /> {t('trips.create.addAnotherDay')}
        </Button>
      </div>
    </section>
  );
}
