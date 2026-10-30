import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@ouiboo/ui';
import type { TFunction } from 'i18next';
import type { TripWizardFormApi } from './useTripWizardForm';
import { ContentLanguageTabs, contentLanguageDir, DEFAULT_CONTENT_LANGUAGE, isCanonicalLanguage, type ContentLanguageCode } from './ContentLanguageTabs';

type Props = {
  t: TFunction;
  form: TripWizardFormApi;
};

/**
 * Wizard step 2 — day-by-day itinerary builder.
 *
 * #584 (phase 2): the language tabs extend to the itinerary. The day
 * STRUCTURE (count, order, dayNumber) is canonical — days are added in
 * French; the other tabs translate each day's title + description into
 * `translations.<lang>.itinerary[i]` (positionally aligned here, the
 * API stamps the canonical dayNumber at the write boundary).
 */
import { AccommodationTier, AccommodationType, ItineraryMeal, type ItineraryStop } from '@ouiboo/types';

const MEAL_OPTIONS = [
  { value: ItineraryMeal.Breakfast, labelKey: 'trips.create.mealBreakfast' },
  { value: ItineraryMeal.Lunch, labelKey: 'trips.create.mealLunch' },
  { value: ItineraryMeal.Dinner, labelKey: 'trips.create.mealDinner' },
] as const;

const ACCOMMODATION_TYPES = [
  AccommodationType.Hotel,
  AccommodationType.Riad,
  AccommodationType.Guesthouse,
  AccommodationType.Camp,
  AccommodationType.Hostel,
  AccommodationType.Other,
] as const;

const ACCOMMODATION_TIERS = [
  AccommodationTier.Standard,
  AccommodationTier.Comfort,
  AccommodationTier.Premium,
] as const;

export function TripItinerary({ t, form }: Props) {
  const { register, errors, itineraryFields, appendDay, watch, setValue } = form;
  const [activeLanguage, setActiveLanguage] = useState<ContentLanguageCode>(DEFAULT_CONTENT_LANGUAGE);
  const dir = contentLanguageDir(activeLanguage);

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2">
        <ContentLanguageTabs
          t={t}
          activeLanguage={activeLanguage}
          onChange={(code) => setActiveLanguage(code as ContentLanguageCode)}
          ariaLabel={t('trips.create.steps.itinerary')}
          testIdPrefix="itinerary-language-tab"
        />
        <p className="text-xs text-muted-foreground">
          {isCanonicalLanguage(activeLanguage) ? t('trips.create.frenchRequiredNote') : t('trips.create.structureNote')}
        </p>
      </div>
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
              {isCanonicalLanguage(activeLanguage) ? (
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
                  {/* #676: the language-neutral slice — numbers, enums
                      and a proper noun; shared by every language, so
                      it is edited here on the canonical tab only. All
                      optional: gaps become a publish-time completeness
                      nudge, never a block. */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t('trips.create.dayDistanceKm')}</label>
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        {...register(`itinerary.${index}.distanceKm`, {
                          setValueAs: (value) => (value === '' || value == null || Number.isNaN(Number(value)) ? undefined : Number(value)),
                        })}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t('trips.create.dayDriveTimeMinutes')}</label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        {...register(`itinerary.${index}.driveTimeMinutes`, {
                          setValueAs: (value) => (value === '' || value == null || Number.isNaN(Number(value)) ? undefined : Number(value)),
                        })}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t('trips.create.dayAccommodationName')}</label>
                      <Input
                        {...register(`itinerary.${index}.accommodationName`, {
                          setValueAs: (value) => (typeof value === 'string' && value.trim() ? value : undefined),
                        })}
                        placeholder={t('trips.create.dayAccommodationNamePlaceholder')}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t('trips.create.dayAccommodationType')}</label>
                      <select
                        {...register(`itinerary.${index}.accommodationType`, {
                          setValueAs: (value) => (value ? (value as AccommodationType) : undefined),
                        })}
                        className="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm focus:outline-none text-foreground"
                      >
                        <option value="">—</option>
                        {ACCOMMODATION_TYPES.map((type) => (
                          <option key={type} value={type}>{t(`trips.create.accommodationTypes.${type}`)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-foreground">{t('trips.create.dayMeals')}</span>
                    <div className="flex flex-wrap gap-4">
                      {MEAL_OPTIONS.map((meal) => {
                        const selected = (watch(`itinerary.${index}.mealsIncluded`) ?? []).includes(meal.value);
                        return (
                          <label key={meal.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(event) => {
                                const current = watch(`itinerary.${index}.mealsIncluded`) ?? [];
                                const next = event.target.checked
                                  ? [...current, meal.value]
                                  : current.filter((value) => value !== meal.value);
                                setValue(`itinerary.${index}.mealsIncluded`, next, { shouldDirty: true });
                              }}
                              className="h-4 w-4 text-primary bg-background border-border focus:ring-primary"
                            />
                            <span className="text-sm font-medium text-foreground">{t(meal.labelKey)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  {/* #701 (Batch F): accommodation tier, per-stop detail,
                      and free-text notes (language-keyed). */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t('batchF.accommodationTier')}</label>
                    <select
                      {...register(`itinerary.${index}.accommodationTier`, {
                        setValueAs: (value) => (value ? (value as AccommodationTier) : undefined),
                      })}
                      className="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm focus:outline-none text-foreground"
                    >
                      <option value="">—</option>
                      {ACCOMMODATION_TIERS.map((tier) => (
                        <option key={tier} value={tier}>{t(`batchF.tiers.${tier}`)}</option>
                      ))}
                    </select>
                  </div>
                  <DayStopsEditor t={t} form={form} index={index} language={activeLanguage} canonical />
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t('batchF.dayNotes')}</label>
                    <textarea
                      value={watch(`itinerary.${index}.notes`)?.[activeLanguage] ?? ''}
                      onChange={(event) => {
                        const current = watch(`itinerary.${index}.notes`) ?? {};
                        setValue(`itinerary.${index}.notes`, { ...current, [activeLanguage]: event.target.value }, { shouldDirty: true });
                      }}
                      className="w-full h-20 p-4 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                      dir={dir}
                    ></textarea>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t('trips.create.dayTitle')}</label>
                    <Input
                      {...register(`translations.${activeLanguage}.itinerary.${index}.title`)}
                      placeholder={t('trips.create.dayTitlePlaceholder')}
                      className="h-12"
                      dir={dir}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t('trips.create.dayDescription')}</label>
                    <textarea
                      {...register(`translations.${activeLanguage}.itinerary.${index}.description`)}
                      className="w-full h-24 p-4 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                      placeholder={t('trips.create.dayDescriptionPlaceholder')}
                      dir={dir}
                    ></textarea>
                  </div>
                  <DayStopsEditor t={t} form={form} index={index} language={activeLanguage} canonical={false} />
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t('batchF.dayNotes')}</label>
                    <textarea
                      value={watch(`itinerary.${index}.notes`)?.[activeLanguage] ?? ''}
                      onChange={(event) => {
                        const current = watch(`itinerary.${index}.notes`) ?? {};
                        setValue(`itinerary.${index}.notes`, { ...current, [activeLanguage]: event.target.value }, { shouldDirty: true });
                      }}
                      className="w-full h-20 p-4 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                      placeholder={t('trips.create.dayDescriptionPlaceholder')}
                      dir={dir}
                    ></textarea>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {errors.itinerary && (
          <p className="text-danger text-sm font-medium p-4 bg-danger/10 border border-danger/30 rounded-xl">
            {t('trips.create.itineraryIncomplete')}
          </p>
        )}
        {isCanonicalLanguage(activeLanguage) && (
          <Button type="button" variant="outline" onClick={() => appendDay({ dayNumber: itineraryFields.length + 1, title: '', description: '', activities: [] })} className="h-14 rounded-2xl border-dashed">
            <Plus className="h-5 w-5 me-2" /> {t('trips.create.addAnotherDay')}
          </Button>
        )}
      </div>
    </section>
  );
}


/**
 * #701: per-stop editor. Structure (add/remove, duration, admission)
 * is edited on the canonical (French) tab; stop NAMES are
 * language-keyed and editable on every language tab.
 */
function DayStopsEditor({
  t,
  form,
  index,
  language,
  canonical,
}: {
  t: TFunction;
  form: TripWizardFormApi;
  index: number;
  language: string;
  canonical: boolean;
}) {
  const stops: ItineraryStop[] = form.watch(`itinerary.${index}.stops`) ?? [];
  const setStops = (next: ItineraryStop[]) =>
    form.setValue(
      `itinerary.${index}.stops`,
      next.map((stop) => ({
        name: stop.name,
        durationMinutes: stop.durationMinutes ?? undefined,
        admissionIncluded: stop.admissionIncluded ?? undefined,
        admissionNote: stop.admissionNote ?? undefined,
      })),
      { shouldDirty: true },
    );
  const updateStop = (stopIndex: number, patch: Partial<ItineraryStop>) =>
    setStops(stops.map((stop, i) => (i === stopIndex ? { ...stop, ...patch } : stop)));

  if (!canonical && stops.length === 0) return null;

  return (
    <div className="space-y-3">
      <span className="text-sm font-semibold text-foreground">{t('batchF.stopsTitle')}</span>
      {stops.map((stop, stopIndex) => (
        <div key={stopIndex} className="space-y-2 rounded-xl border border-border p-3">
          <div className="flex gap-2">
            <Input
              value={stop.name[language] ?? ''}
              placeholder={stop.name.fr ?? t('batchF.stopName')}
              onChange={(event) =>
                updateStop(stopIndex, { name: { ...stop.name, [language]: event.target.value } })
              }
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            />
            {canonical && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('common.delete')}
                onClick={() => setStops(stops.filter((_, i) => i !== stopIndex))}
                className="text-danger hover:bg-danger/10"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {canonical && (
            <div className="flex flex-wrap items-center gap-4">
              <Input
                type="number"
                min={0}
                step={1}
                value={stop.durationMinutes ?? ''}
                placeholder={t('batchF.stopDuration')}
                onChange={(event) =>
                  updateStop(stopIndex, {
                    durationMinutes: event.target.value === '' ? undefined : Number(event.target.value),
                  })
                }
                className="w-40"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stop.admissionIncluded ?? false}
                  onChange={(event) => updateStop(stopIndex, { admissionIncluded: event.target.checked })}
                  className="h-4 w-4 text-primary bg-background border-border focus:ring-primary"
                />
                <span className="text-sm font-medium text-foreground">{t('batchF.stopAdmission')}</span>
              </label>
            </div>
          )}
        </div>
      ))}
      {canonical && stops.length < 12 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setStops([...stops, { name: {} }])}
          className="w-full border-dashed"
        >
          <Plus className="h-4 w-4 me-2" /> {t('batchF.stopAdd')}
        </Button>
      )}
    </div>
  );
}
