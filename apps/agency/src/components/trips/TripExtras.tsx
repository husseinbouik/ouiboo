import { Plus, Info, X, Check } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import type { TFunction } from 'i18next';
import type { TripWizardFormApi } from './useTripWizardForm';

type Props = {
  t: TFunction;
  form: TripWizardFormApi;
  mode: 'create' | 'edit';
};

/** Wizard step 4 — inclusions, exclusions, packing checklist, and publish status. */
export function TripExtras({ t, form, mode }: Props) {
  const { register, watch, inclusions, exclusions, checklist } = form;

  return (
    <section className="space-y-8 animate-in fade-in duration-300">
      <Card className="border border-border shadow-sm bg-card">
        <header className="p-6 border-b border-border flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
            <Check className="h-5 w-5 text-success" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{t('trips.create.includedTitle')}</h3>
            <p className="text-xs text-muted-foreground">{t('trips.create.includedSubtitle')}</p>
          </div>
        </header>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-4">
            {inclusions.fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Input {...register(`inclusions.${index}`)} placeholder={t('trips.create.includedPlaceholder')} />
                <Button type="button" variant="ghost" size="icon" aria-label={t('common.delete')} onClick={() => inclusions.remove(index)} className="text-danger hover:bg-danger/10">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => inclusions.append('')} className="w-full border-dashed">
              <Plus className="h-4 w-4 me-2" /> {t('trips.create.addIncluded')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border shadow-sm bg-card">
        <header className="p-6 border-b border-border flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-danger/10 flex items-center justify-center">
            <X className="h-5 w-5 text-danger" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{t('trips.create.excludedTitle')}</h3>
            <p className="text-xs text-muted-foreground">{t('trips.create.excludedSubtitle')}</p>
          </div>
        </header>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-4">
            {exclusions.fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Input {...register(`exclusions.${index}`)} placeholder={t('trips.create.excludedPlaceholder')} />
                <Button type="button" variant="ghost" size="icon" aria-label={t('common.delete')} onClick={() => exclusions.remove(index)} className="text-danger hover:bg-danger/10">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => exclusions.append('')} className="w-full border-dashed">
              <Plus className="h-4 w-4 me-2" /> {t('trips.create.addExcluded')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border shadow-sm bg-card">
        <header className="p-6 border-b border-border flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <Info className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{t('trips.create.checklistTitle')}</h3>
            <p className="text-xs text-muted-foreground">{t('trips.create.checklistSubtitle')}</p>
          </div>
        </header>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-4">
            {checklist.fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Input {...register(`checklist.${index}`)} placeholder={t('trips.create.checklistPlaceholder')} />
                <Button type="button" variant="ghost" size="icon" aria-label={t('common.delete')} onClick={() => checklist.remove(index)} className="text-danger hover:bg-danger/10">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => checklist.append('')} className="w-full border-dashed">
              <Plus className="h-4 w-4 me-2" /> {t('trips.create.addChecklist')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 pt-4 border-t border-border">
        <label className="text-sm font-semibold text-foreground">{t('trips.create.publishStatus')}</label>
        <div className="flex gap-6">
          {['DRAFT', 'ACTIVE'].map((s) => (
            <label key={s} className="flex items-center gap-3 cursor-pointer group">
              {mode === 'create' ? (
                <>
                  <input type="radio" value={s} {...register('status')} className="h-4 w-4 text-primary bg-background border-border focus:ring-primary" />
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {s === 'DRAFT' ? t('trips.create.draft') : t('trips.create.active')}
                  </span>
                </>
              ) : (
                <>
                  <input
                    type="radio"
                    {...register('status')}
                    value={s}
                    className="w-5 h-5 text-accent bg-background border-border focus:ring-accent"
                  />
                  <span className={cn(
                    "text-sm font-bold transition-colors",
                    watch('status') === s ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {s === 'DRAFT' ? t('trips.create.draft') : t('trips.create.active')}
                  </span>
                </>
              )}
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
