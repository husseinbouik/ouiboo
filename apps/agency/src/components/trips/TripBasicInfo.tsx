import { useState } from 'react';
import { Input, Card, CardContent } from '@ouiboo/ui';
import type { TFunction } from 'i18next';
import type { TripWizardFormApi } from './useTripWizardForm';
import { CANONICAL_LANGUAGE, CONTENT_LANGUAGES, ContentLanguageTabs, contentLanguageDir, isCanonicalLanguage, languagePresentation, type ContentLanguageCode } from './ContentLanguageTabs';

type Props = {
  t: TFunction;
  form: TripWizardFormApi;
};

/** Wizard step 1 — trip basics: title, description (per language), category, locations, duration, currency. */
export function TripBasicInfo({ t, form }: Props) {
  const { register, errors, watch } = form;
  const [activeLanguage, setActiveLanguage] = useState<ContentLanguageCode>(CANONICAL_LANGUAGE as ContentLanguageCode);

  // #546: completeness hint for the encouraged languages — a language
  // counts as translated only with BOTH a title and a description.
  const translations = watch('translations');
  const missingLanguages = CONTENT_LANGUAGES.filter(({ code }) => !isCanonicalLanguage(code))
    .filter(({ code }) => {
      const entry = translations?.[code];
      return !(entry?.title?.trim() && entry?.description?.trim());
    })
    .map(({ code }) => {
      const { labelKey } = languagePresentation(code);
      return labelKey ? t(labelKey) : code.toUpperCase();
    });

  const activeDir = contentLanguageDir(activeLanguage);

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      <Card className="border border-border shadow-sm bg-card">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <ContentLanguageTabs
              t={t}
              activeLanguage={activeLanguage}
              onChange={(code) => setActiveLanguage(code as ContentLanguageCode)}
              ariaLabel={t('trips.create.title')}
            />
            <p className="text-xs text-muted-foreground">{t('trips.create.frenchRequiredNote')}</p>
            {missingLanguages.length > 0 && (
              <p className="text-xs text-muted-foreground" data-testid="translations-missing-hint">
                {t('trips.create.translationsMissingHint', { languages: missingLanguages.join(', ') })}
              </p>
            )}
          </div>

          {isCanonicalLanguage(activeLanguage) ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('trips.create.title')}</label>
                <Input {...register('title')} placeholder={t('trips.create.titlePlaceholder')} className="h-12" dir="ltr" />
                {errors.title && <p className="text-danger text-xs font-medium">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('trips.create.description')}</label>
                <textarea
                  {...register('description')}
                  className="w-full h-32 p-4 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                  placeholder={t('trips.create.descriptionPlaceholder')}
                  dir="ltr"
                ></textarea>
                {errors.description && <p className="text-danger text-xs font-medium">{errors.description.message}</p>}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('trips.create.title')}</label>
                <Input
                  {...register(`translations.${activeLanguage}.title`)}
                  placeholder={t('trips.create.titlePlaceholder')}
                  className="h-12"
                  dir={activeDir}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('trips.create.description')}</label>
                <textarea
                  {...register(`translations.${activeLanguage}.description`)}
                  className="w-full h-32 p-4 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                  placeholder={t('trips.create.descriptionPlaceholder')}
                  dir={activeDir}
                ></textarea>
              </div>
            </>
          )}

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
