'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { 
  MapPin, 
  Clock, 
  Plus, 
  Image as ImageIcon,
  ChevronLeft,
  Info,
  X,
  Check
} from 'lucide-react';
import { Button, Input, Card, CardContent } from '@ouiboo/ui';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTripTemplateSchema, type CreateTripInput } from '@ouiboo/schemas';
import { apiClient } from '@/lib/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';
import { TripCategory, TripStatus } from '@ouiboo/types';
import { useStringArrayField } from '@/hooks/useStringArrayField';

type ApiError = {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
  message?: string;
};

export default function CreateTripPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const { register, handleSubmit, control, watch, setValue, trigger, formState: { errors } } = useForm<CreateTripInput>({
    resolver: zodResolver(CreateTripTemplateSchema),
    defaultValues: {
      category: TripCategory.Adventure,
      inclusions: [],
      exclusions: [],
      checklist: [],
      images: [],
      status: TripStatus.Draft,
      currency: 'MAD',
      durationDays: 1,
      durationNights: 0,
    }
  });

  const { fields: inclusionFields, append: appendInclusion, remove: removeInclusion } = useStringArrayField(
    control,
    setValue,
    'inclusions'
  );

  const { fields: exclusionFields, append: appendExclusion, remove: removeExclusion } = useStringArrayField(
    control,
    setValue,
    'exclusions'
  );

  const { fields: checklistFields, append: appendChecklistItem, remove: removeChecklistItem } = useStringArrayField(
    control,
    setValue,
    'checklist'
  );

  const { fields: itineraryFields, append: appendDay } = useFieldArray({
    control,
    name: 'itinerary'
  });

  const watchedImages = watch('images') || [];

  const createTripMutation = useMutation({
    mutationFn: async (data: CreateTripInput) => {
      const response = await apiClient.post('/trips', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
      router.push('/dashboard/trips');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || error.message || t('trips.create.createError');
      setSubmissionError(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t('trips.create.imageTooLarge'));
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

try {
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const imageUrl = response.data.url;
      
      const currentImages = watch('images') || [];
      setValue('images', [...currentImages, imageUrl], { shouldValidate: true });
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message = apiError.response?.data?.message || apiError.message || '';
      setUploadError(t('trips.create.uploadFailed', { message: Array.isArray(message) ? message.join(', ') : message }));
    } finally {
      setUploading(false);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: Array<keyof CreateTripInput | 'itinerary'> = [];
    if (step === 1) fieldsToValidate = ['title', 'description', 'category', 'startLocation', 'durationDays', 'durationNights'];
    if (step === 2) fieldsToValidate = ['itinerary'];
    if (step === 3) fieldsToValidate = ['images'];
    
    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      if (step === 1 && itineraryFields.length === 0) {
        // Initialize itinerary based on durationDays
        const days = watch('durationDays');
        for (let i = 1; i <= days; i++) {
          appendDay({ dayNumber: i, title: `Day ${i}`, description: '', activities: [] });
        }
      }
      setStep(s => s + 1);
    }
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const onSubmit = (data: CreateTripInput) => {
    setSubmissionError('');
    // Safety check: only allow submission from the final step
    if (step < 4) {
      nextStep();
      return;
    }

    // Clean up itinerary data to remove IDs and ensure proper types
    const cleanedData = {
      ...data,
      itinerary: data.itinerary?.map((day) => ({
        dayNumber: Number(day.dayNumber),
        title: day.title,
        description: day.description,
        activities: Array.isArray(day.activities) ? day.activities : []
      }))
    };

    createTripMutation.mutate(cleanedData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500 pb-12">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/trips" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {t('trips.detail.backToTrips')}
        </Link>
        <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn(
                "h-1.5 w-8 rounded-full transition-all duration-300",
                i <= step ? "bg-primary" : "bg-muted"
              )}></div>
            ))}
        </div>
      </div>

      <form 
        onSubmit={handleSubmit(onSubmit)} 
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {step === 1 && t('trips.create.steps.basic')}
            {step === 2 && t('trips.create.steps.itinerary')}
            {step === 3 && t('trips.create.steps.media')}
            {step === 4 && t('trips.create.steps.pricing')}
          </h1>
          <p className="text-muted-foreground mt-2">{t('trips.create.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {step === 1 && (
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
            )}

            {step === 2 && (
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
            )}

            {step === 3 && (
              <section className="space-y-6 animate-in fade-in duration-300">
                <Card className="border border-border shadow-sm bg-card">
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {watchedImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-video bg-muted rounded-xl overflow-hidden group border border-border">
                          <Image src={img} className="w-full h-full object-cover" alt={t('trips.create.imageAlt', { name: watch('title') || t('trips.create.untitledAdventure'), index: idx + 1 })} fill sizes="(min-width: 768px) 33vw, 50vw" />
                          <button 
                            type="button"
                            aria-label={t('common.delete')}
                            onClick={() => {
                              const newImages = [...watchedImages];
                              newImages.splice(idx, 1);
                              setValue('images', newImages, { shouldValidate: true });
                            }}
                            className="absolute top-2 end-2 p-1 bg-danger text-danger-foreground rounded-full hover:scale-110 transition-transform"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <label className="aspect-video border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-accent bg-muted/50 transition-colors">
                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept="image/*" />
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
                    {uploadError ? (
                      <p role="alert" className="rounded-xl bg-danger/10 border border-danger/30 p-4 text-sm font-medium text-danger">
                        {uploadError}
                      </p>
                    ) : null}
                    
                    <div className="p-4 bg-primary/10 rounded-xl flex gap-3 border border-primary/30">
                       <Info className="h-5 w-5 text-primary shrink-0" />
                       <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                         {t('trips.create.imageHint')}
                       </p>
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {step === 4 && (
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
                      {inclusionFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2">
                          <Input {...register(`inclusions.${index}`)} placeholder={t('trips.create.includedPlaceholder')} />
                          <Button type="button" variant="ghost" size="icon" aria-label={t('common.delete')} onClick={() => removeInclusion(index)} className="text-danger hover:bg-danger/10">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => appendInclusion('')} className="w-full border-dashed">
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
                      {exclusionFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2">
                          <Input {...register(`exclusions.${index}`)} placeholder={t('trips.create.excludedPlaceholder')} />
                          <Button type="button" variant="ghost" size="icon" aria-label={t('common.delete')} onClick={() => removeExclusion(index)} className="text-danger hover:bg-danger/10">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => appendExclusion('')} className="w-full border-dashed">
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
                      {checklistFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2">
                          <Input {...register(`checklist.${index}`)} placeholder={t('trips.create.checklistPlaceholder')} />
                          <Button type="button" variant="ghost" size="icon" aria-label={t('common.delete')} onClick={() => removeChecklistItem(index)} className="text-danger hover:bg-danger/10">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => appendChecklistItem('')} className="w-full border-dashed">
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
                            <input type="radio" value={s} {...register('status')} className="h-4 w-4 text-primary bg-background border-border focus:ring-primary" />
                            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                              {s === 'DRAFT' ? t('trips.create.draft') : t('trips.create.active')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
              </section>
            )}

            {submissionError ? (
              <p role="alert" className="rounded-xl bg-danger/10 border border-danger/30 p-4 text-sm font-medium text-danger">
                {submissionError}
              </p>
            ) : null}

            <div className="pt-8 border-t border-border flex items-center justify-between">
              <Button 
                type="button"
                variant="outline" 
                onClick={prevStep}
                disabled={step === 1}
                className="px-8 h-12"
              >
                {t('trips.create.previous')}
              </Button>
              {step < 4 ? (
                <Button 
                  key="continue-btn"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    nextStep();
                  }}
                  className="px-10 h-12 bg-primary hover:bg-primary/90 text-primary-foreground border-none shadow-lg shadow-primary/20"
                >
                  {t('common.continue')}
                </Button>
              ) : (
                <Button 
                  key="submit-btn"
                  type="submit"
                  disabled={createTripMutation.isPending}
                  className="px-10 h-12 bg-accent hover:bg-accent/90 text-accent-foreground border-none shadow-lg shadow-accent/20 font-bold"
                >
                  {createTripMutation.isPending ? t('common.publishing') : t('common.publish')}
                </Button>
              )}
            </div>
          </div>

          {/* Preview Sidebar */}
          <div className="hidden lg:block">
             <div className="sticky top-24 space-y-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{t('trips.create.livePreview')}</p>
                <Card className="border border-border shadow-2xl overflow-hidden rounded-2xl bg-card group">
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
                            <span className="text-xs font-bold text-foreground">{watch('durationDays')}D/{watch('durationNights')}N</span>
                         </div>
                         <div className="flex items-center gap-1.5 min-w-0">
                            <MapPin className="h-4 w-4 text-accent" />
                            <span className="text-xs font-bold text-foreground truncate">{watch('startLocation') || t('trips.create.tbd')}</span>
                         </div>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('trips.create.basePackage')}</span>
                         <span className="text-lg font-black text-foreground">{t('trips.create.pricePreview', { currency: watch('currency') || 'MAD' })}</span>
                      </div>
                   </CardContent>
                </Card>
             </div>
          </div>
        </div>
      </form>
    </div>
  );
}
