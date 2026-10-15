import Image from 'next/image';
import { MapPin, Clock, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import type { TFunction } from 'i18next';
import type { TripWizardFormApi } from './useTripWizardForm';

type Props = {
  t: TFunction;
  form: TripWizardFormApi;
  mode: 'create' | 'edit';
};

/** Sticky live-preview card shown beside the wizard on large screens. */
export function TripLivePreview({ t, form, mode }: Props) {
  const { watch, watchedImages } = form;

  return (
    <div className="hidden lg:block">
      <div className="sticky top-24 space-y-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{t('trips.create.livePreview')}</p>
        <Card className={cn(
          "border border-border shadow-2xl overflow-hidden rounded-2xl bg-card group",
          mode === 'edit' && "scale-[0.9] origin-top"
        )}>
          <div className="relative h-48 bg-muted">
            {watchedImages[0] ? (
              <Image src={watchedImages[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={watch('title') || t('trips.create.untitledAdventure')} fill sizes="(min-width: 1024px) 20vw, 100vw" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-12 w-12" />
              </div>
            )}
            <div className="absolute top-4 start-4">
              <span className="text-[10px] px-2 py-1 bg-card/90 backdrop-blur rounded-md font-bold text-foreground uppercase tracking-wider shadow-sm">
                {watch('category')}
              </span>
            </div>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-2 min-h-[3.5rem]">
                {watch('title') || t('trips.create.untitledAdventure')}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {watch('description') || t('trips.create.noDescription')}
              </p>
            </div>
            <div className="flex items-center gap-4 py-4 border-y border-border">
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock className="h-4 w-4 text-accent" />
                {mode === 'create' ? (
                  <span className="text-xs font-bold text-foreground">{watch('durationDays')}D/{watch('durationNights')}N</span>
                ) : (
                  <span className="text-xs font-bold text-foreground">{t('trips.edit.packShort', { days: watch('durationDays'), nights: watch('durationNights') })}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="h-4 w-4 text-accent" />
                <span className="text-xs font-bold text-foreground truncate">{watch('startLocation') || t('trips.create.tbd')}</span>
              </div>
            </div>
            {mode === 'create' && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('trips.create.basePackage')}</span>
                <span className="text-lg font-black text-foreground">{t('trips.create.pricePreview', { currency: watch('currency') || 'MAD' })}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
