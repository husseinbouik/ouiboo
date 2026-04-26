'use client';

import Image from 'next/image';
import React, { useState, useSyncExternalStore } from 'react';
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
import { TripStatus } from '@ouiboo/types';

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
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const { register, handleSubmit, control, watch, setValue, trigger, formState: { errors } } = useForm<CreateTripInput>({
    resolver: zodResolver(CreateTripTemplateSchema),
    defaultValues: {
      category: 'ADVENTURE',
      inclusions: [],
      exclusions: [],
      checklist: [],
      images: [],
      status: TripStatus.Draft,
      durationDays: 1,
      durationNights: 0,
    }
  });

  const { fields: inclusionFields, append: appendInclusion, remove: removeInclusion } = useFieldArray({
    control,
    name: 'inclusions'
  });

  const { fields: exclusionFields, append: appendExclusion, remove: removeExclusion } = useFieldArray({
    control,
    name: 'exclusions'
  });

  const { fields: checklistFields, append: appendChecklistItem, remove: removeChecklistItem } = useFieldArray({
    control,
    name: 'checklist'
  });

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
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Max size is 5MB.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('[CreateTrip] Uploading file:', file.name, file.type);
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const imageUrl = response.data.url;
      console.log('[CreateTrip] Upload successful:', imageUrl);
      
      const currentImages = watch('images') || [];
      setValue('images', [...currentImages, imageUrl], { shouldValidate: true });
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Upload failed:', error);
      const message = apiError.response?.data?.message || apiError.message || 'Upload failed';
      alert(`Upload failed: ${Array.isArray(message) ? message.join(', ') : message}`);
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

    console.log('Finalizing trip submission:', cleanedData);
    createTripMutation.mutate(cleanedData);
  };

  if (!isMounted) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500 pb-12">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/trips" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-deep-blue dark:hover:text-blue-400 transition-colors">
          <ChevronLeft className="h-4 w-4" />
          {t('common.back', 'Back to Trips')}
        </Link>
        <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn(
                "h-1.5 w-8 rounded-full transition-all duration-300",
                i <= step ? "bg-deep-blue dark:bg-blue-600" : "bg-gray-200 dark:bg-slate-800"
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
          <h1 className="text-3xl font-bold text-deep-blue dark:text-gray-100">
            {step === 1 && t('trips.create.steps.basic', 'Basic Information')}
            {step === 2 && t('trips.create.steps.itinerary', 'Day-by-Day Itinerary')}
            {step === 3 && t('trips.create.steps.media', 'Media & Gallery')}
            {step === 4 && t('trips.create.steps.pricing', 'Settings & Details')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">{t('trips.create.subtitle', 'Fill in the details to create your travel package.')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {step === 1 && (
              <section className="space-y-6 animate-in fade-in duration-300">
                <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Trip Title</label>
                      <Input {...register('title')} placeholder="e.g. 5 Days in the Sahara Desert" className="h-12 dark:bg-slate-800 dark:border-slate-700" />
                      {errors.title && <p className="text-red-500 text-xs font-medium">{errors.title.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                      <textarea 
                        {...register('description')}
                        className="w-full h-32 p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-deep-blue/5 focus:border-deep-blue dark:focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100"
                        placeholder="Describe the unique experience..."
                      ></textarea>
                      {errors.description && <p className="text-red-500 text-xs font-medium">{errors.description.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category</label>
                        <select {...register('category')} className="w-full h-12 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none dark:text-gray-100">
                          <option value="ADVENTURE">Adventure</option>
                          <option value="CULTURAL">Cultural</option>
                          <option value="LUXURY">Luxury</option>
                          <option value="BUDGET">Budget</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Starting Location</label>
                        <Input {...register('startLocation')} placeholder="City, Country" className="h-12 dark:bg-slate-800 dark:border-slate-700" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Days</label>
                        <Input type="number" {...register('durationDays', { valueAsNumber: true })} className="h-12 dark:bg-slate-800 dark:border-slate-700" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nights</label>
                        <Input type="number" {...register('durationNights', { valueAsNumber: true })} className="h-12 dark:bg-slate-800 dark:border-slate-700" />
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
                    <Card key={field.id} className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-sunset-orange/10 text-sunset-orange flex items-center justify-center text-sm">{index + 1}</span>
                            Day {index + 1}
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Title</label>
                            <Input {...register(`itinerary.${index}.title`)} placeholder="e.g. Arrival and City Tour" className="h-12 dark:bg-slate-800 dark:border-slate-700" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">What happens on this day?</label>
                            <textarea 
                              {...register(`itinerary.${index}.description`)}
                              className="w-full h-24 p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-deep-blue/5 focus:border-deep-blue dark:focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100"
                              placeholder="Describe the plan for the day..."
                            ></textarea>
                            <input type="hidden" {...register(`itinerary.${index}.dayNumber`, { valueAsNumber: true })} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {errors.itinerary && (
                    <p className="text-red-500 text-sm font-medium p-4 bg-red-50 dark:bg-red-900/10 rounded-xl">
                      Please fill in all itinerary days. All descriptions are required.
                    </p>
                  )}
                  <Button type="button" variant="outline" onClick={() => appendDay({ dayNumber: itineraryFields.length + 1, title: '', description: '', activities: [] })} className="h-14 rounded-2xl border-dashed">
                    <Plus className="h-5 w-5 mr-2" /> Add Another Day
                  </Button>
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="space-y-6 animate-in fade-in duration-300">
                <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {watchedImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-video bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden group border dark:border-slate-700">
                          <Image src={img} className="w-full h-full object-cover" alt="" fill sizes="(min-width: 768px) 33vw, 50vw" />
                          <button 
                            type="button"
                            onClick={() => {
                              const newImages = [...watchedImages];
                              newImages.splice(idx, 1);
                              setValue('images', newImages, { shouldValidate: true });
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <label className="aspect-video border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-sunset-orange dark:hover:border-orange-500 bg-gray-50 dark:bg-slate-800 transition-colors">
                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept="image/*" />
                        {uploading ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sunset-orange"></div>
                        ) : (
                          <>
                            <Plus className="h-6 w-6 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add Image</span>
                          </>
                        )}
                      </label>
                    </div>
                    {errors.images && <p className="text-red-500 text-xs font-medium">{errors.images.message}</p>}
                    
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl flex gap-3 border border-blue-100 dark:border-blue-900/20">
                       <Info className="h-5 w-5 text-blue-600 shrink-0" />
                       <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
                         Upload clear, high-resolution pictures to attract more travelers. At least one image is required to publish.
                       </p>
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {step === 4 && (
              <section className="space-y-8 animate-in fade-in duration-300">
                <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
                  <header className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Check className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100">Included in the trip</h3>
                      <p className="text-xs text-gray-500">List everything the traveler gets</p>
                    </div>
                  </header>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-4">
                      {inclusionFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2">
                          <Input {...register(`inclusions.${index}`)} placeholder="e.g. Comfy transport" className="dark:bg-slate-800" />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeInclusion(index)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => appendInclusion('')} className="w-full border-dashed">
                        <Plus className="h-4 w-4 mr-2" /> Add Included Item
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
                  <header className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <X className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100">Excluded / Optional</h3>
                      <p className="text-xs text-gray-500">Extras that travelers pay separately</p>
                    </div>
                  </header>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-4">
                      {exclusionFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2">
                          <Input {...register(`exclusions.${index}`)} placeholder="e.g. Safari Nature (150 Dhs)" className="dark:bg-slate-800" />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeExclusion(index)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => appendExclusion('')} className="w-full border-dashed">
                        <Plus className="h-4 w-4 mr-2" /> Add Excluded Item
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
                  <header className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Info className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100">Traveler Checklist</h3>
                      <p className="text-xs text-gray-500">What should they pack? (e.g. Hiking shoes)</p>
                    </div>
                  </header>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-4">
                      {checklistFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2">
                          <Input {...register(`checklist.${index}`)} placeholder="e.g. Your smile" className="dark:bg-slate-800" />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeChecklistItem(index)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => appendChecklistItem('')} className="w-full border-dashed">
                        <Plus className="h-4 w-4 mr-2" /> Add Checklist Item
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <div className="space-y-4 pt-4 border-t dark:border-slate-800">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Publish Status</label>
                      <div className="flex gap-6">
                        {['DRAFT', 'ACTIVE'].map((s) => (
                          <label key={s} className="flex items-center gap-3 cursor-pointer group">
                            <input type="radio" value={s} {...register('status')} className="h-4 w-4 text-deep-blue bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 focus:ring-deep-blue" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-deep-blue transition-colors">
                              {s === 'DRAFT' ? 'Draft' : 'Active'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
              </section>
            )}

            <div className="pt-8 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <Button 
                type="button"
                variant="outline" 
                onClick={prevStep}
                disabled={step === 1}
                className="px-8 h-12 dark:border-slate-700 dark:text-gray-300"
              >
                Previous
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
                  className="px-10 h-12 bg-deep-blue hover:bg-blue-900 text-white border-none shadow-lg shadow-blue-900/20"
                >
                  {t('common.continue', 'Continue')}
                </Button>
              ) : (
                <Button 
                  key="submit-btn"
                  type="submit"
                  disabled={createTripMutation.isPending}
                  className="px-10 h-12 bg-sunset-orange hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-900/20 font-bold"
                >
                  {createTripMutation.isPending ? t('common.publishing', 'Publishing...') : t('common.publish', 'Publish Trip')}
                </Button>
              )}
            </div>
          </div>

          {/* Preview Sidebar */}
          <div className="hidden lg:block">
             <div className="sticky top-24 space-y-4">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Live Preview</p>
                <Card className="border-none shadow-2xl overflow-hidden rounded-2xl dark:bg-slate-900 dark:border-slate-800 group">
                   <div className="relative h-48 bg-gray-200 dark:bg-slate-800">
                      {watchedImages[0] ? (
                        <Image src={watchedImages[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" fill sizes="(min-width: 1024px) 20vw, 100vw" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-slate-600">
                           <ImageIcon className="h-12 w-12" />
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                         <span className="text-[10px] px-2 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-md font-bold text-deep-blue dark:text-blue-400 uppercase tracking-wider shadow-sm">
                            {watch('category')}
                         </span>
                      </div>
                   </div>
                   <CardContent className="p-6 space-y-4">
                      <div className="space-y-1">
                         <h3 className="font-bold text-deep-blue dark:text-gray-100 text-lg leading-tight line-clamp-2 min-h-[3.5rem]">
                            {watch('title') || 'Untitled Adventure'}
                         </h3>
                         <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                           {watch('description') || 'No description provided yet.'}
                         </p>
                      </div>
                      <div className="flex items-center gap-4 py-4 border-y border-gray-50 dark:border-slate-800">
                         <div className="flex items-center gap-1.5 min-w-0">
                            <Clock className="h-4 w-4 text-sunset-orange" />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{watch('durationDays')}D/{watch('durationNights')}N</span>
                         </div>
                         <div className="flex items-center gap-1.5 min-w-0">
                            <MapPin className="h-4 w-4 text-sunset-orange" />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{watch('startLocation') || 'TBD'}</span>
                         </div>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Base Pkg</span>
                         <span className="text-lg font-black text-deep-blue dark:text-blue-400">--- MAD</span>
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
