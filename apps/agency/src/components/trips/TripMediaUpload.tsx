import Image from 'next/image';
import { Plus, Info, X } from 'lucide-react';
import { Card, CardContent } from '@ouiboo/ui';
import type { TFunction } from 'i18next';
import type { TripWizardFormApi } from './useTripWizardForm';

type Props = {
  t: TFunction;
  form: TripWizardFormApi;
  /** 'create' shows the upload-error alert and the image hint box; 'edit' shows neither. */
  mode: 'create' | 'edit';
};

/** Wizard step 3 — trip photo gallery with upload. */
export function TripMediaUpload({ t, form, mode }: Props) {
  const { watch, setValue, errors, watchedImages, watchedImageAlts, handleImageAltChange, uploading, uploadError, handleFileUpload } = form;

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      <Card className="border border-border shadow-sm bg-card">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {watchedImages.map((img, idx) => (
              <div key={idx} className="space-y-2">
                <div className="relative aspect-video bg-muted rounded-xl overflow-hidden group border border-border">
                  <Image src={img} className="w-full h-full object-cover" alt={watchedImageAlts[idx]?.trim() || t('trips.create.imageAlt', { name: watch('title') || t('trips.create.untitledAdventure'), index: idx + 1 })} fill sizes="(min-width: 768px) 33vw, 50vw" />
                  <button
                    type="button"
                    aria-label={t('common.delete')}
                    onClick={() => {
                      const newImages = [...watchedImages];
                      newImages.splice(idx, 1);
                      setValue('images', newImages, { shouldValidate: true });
                      // Keep alt texts index-aligned with the images.
                      const newAlts = newImages.map((_, i) => watchedImageAlts[i < idx ? i : i + 1] ?? '');
                      setValue('imageAlts', newAlts, { shouldValidate: true });
                    }}
                    className="absolute top-2 end-2 p-1 bg-danger text-danger-foreground rounded-full hover:scale-110 transition-transform"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {/* #332: per-photo alt text prompt. Optional — empty means
                    the generated "title - departure city" alt is used. */}
                <div>
                  <label htmlFor={`image-alt-${idx}`} className="text-[11px] font-medium text-muted-foreground">
                    {t('trips.create.imageAltLabel')}
                  </label>
                  <input
                    id={`image-alt-${idx}`}
                    type="text"
                    maxLength={300}
                    value={watchedImageAlts[idx] ?? ''}
                    onChange={(e) => handleImageAltChange(idx, e.target.value)}
                    placeholder={t('trips.create.imageAltPlaceholder')}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
            ))}
            <label className="aspect-video border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-accent bg-muted/50 transition-colors focus-within:ring-2 focus-within:ring-accent">
              {/* #332: sr-only (not display:none) keeps the upload in the
                  Tab order for keyboard users; label shows focus-within ring. */}
              <input type="file" className="sr-only" onChange={handleFileUpload} disabled={uploading} accept="image/*" />
              {uploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
              ) : (
                <>
                  <Plus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">{t('trips.create.addImage')}</span>
                </>
              )}
            </label>
          </div>
          {errors.images && <p className="text-danger text-xs font-medium">{errors.images.message}</p>}
          {mode === 'create' && uploadError ? (
            <p role="alert" className="rounded-xl bg-danger/10 border border-danger/30 p-4 text-sm font-medium text-danger">
              {uploadError}
            </p>
          ) : null}

          {mode === 'create' && (
            <div className="p-4 bg-primary/10 rounded-xl flex gap-3 border border-primary/30">
              <Info className="h-5 w-5 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                {t('trips.create.imageHint')}
                <span className="block mt-1">{t('trips.create.imageAltHint')}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
