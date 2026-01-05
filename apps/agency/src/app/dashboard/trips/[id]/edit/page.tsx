'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Image as ImageIcon,
  ChevronLeft,
  Info,
  X,
  Clock,
  MapPin,
  Save
} from 'lucide-react';
import { Button, Input, Card, CardContent } from '@ouiboo/ui';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTripTemplateSchema, type CreateTripInput } from '@ouiboo/schemas';
import { apiClient } from '@/lib/api-client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';

export default function EditTripPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: trip, isLoading: isLoadingTrip } = useQuery({
    queryKey: ['trip', id],
    queryFn: async () => {
      const response = await apiClient.get(`/trips/${id}`);
      return response.data;
    }
  });

  const { register, handleSubmit, control, watch, setValue, trigger, reset, formState: { errors } } = useForm<CreateTripInput>({
    resolver: zodResolver(CreateTripTemplateSchema),
  });

  useEffect(() => {
    if (trip) {
      reset({
        title: trip.title,
        description: trip.description,
        category: trip.category,
        startLocation: trip.startLocation,
        durationDays: trip.durationDays,
        durationNights: trip.durationNights,
        inclusions: trip.inclusions || [],
        images: trip.images || [],
        status: trip.status,
      });
    }
  }, [trip, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'inclusions' as any
  });

  const watchedImages = watch('images') || [];

  const updateTripMutation = useMutation({
    mutationFn: async (data: CreateTripInput) => {
      const response = await apiClient.patch(`/trips/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      router.push(`/dashboard/trips/${id}`);
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/upload', formData);
      const currentImages = watch('images') || [];
      setValue('images', [...currentImages, response.data.url], { shouldValidate: true });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ['title', 'description', 'category', 'startLocation', 'durationDays', 'durationNights'];
    if (step === 2) fieldsToValidate = ['images'];
    
    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) {
      setStep(3);
    }
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const onSubmit = (data: CreateTripInput) => {
    // Safety check: only allow submission from the final step
    if (step < 3) {
      nextStep();
      return;
    }
    updateTripMutation.mutate(data);
  };

  if (!mounted || isLoadingTrip) return (
    <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sunset-orange"></div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500 pb-12">
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/trips/${id}`} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-deep-blue dark:hover:text-blue-400 transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Trip Detail
        </Link>
        <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={cn(
                "h-1.5 w-8 rounded-full transition-all duration-300",
                i === step ? "bg-deep-blue dark:bg-blue-600 w-12" : i < step ? "bg-emerald-500" : "bg-gray-200 dark:bg-slate-800"
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
            Edit Trip: {trip?.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {step === 1 && "Update basic trip information and logistics."}
            {step === 2 && "Manage your trip gallery and visual representation."}
            {step === 3 && "Finalize inclusions and trip status."}
          </p>
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
                <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {watchedImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-video bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden group border dark:border-slate-700">
                          <img src={img} className="w-full h-full object-cover" alt="" />
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
                  </CardContent>
                </Card>
              </section>
            )}

            {step === 3 && (
              <section className="space-y-6 animate-in fade-in duration-300">
                <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">What's Included</label>
                      <div className="space-y-3">
                        {fields.map((field, index) => (
                          <div key={field.id} className="flex gap-2">
                            <Input {...register(`inclusions.${index}` as any)} className="h-12 dark:bg-slate-800 dark:border-slate-700" placeholder="e.g. Daily Breakfast..." />
                            <Button type="button" variant="ghost" onClick={() => remove(index)} className="text-red-500 hover:bg-red-50 h-12">
                               <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" onClick={() => append("")} className="w-full h-12 dark:border-slate-700 border-dashed">
                          <Plus className="h-4 w-4 mr-2" /> Add Inclusion
                        </Button>
                      </div>
                    </div>
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
                  </CardContent>
                </Card>
              </section>
            )}

            <div className="pt-8 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <Button 
                key="prev-btn"
                type="button"
                variant="outline" 
                onClick={prevStep}
                disabled={step === 1}
                className="px-8 h-12 dark:border-slate-700"
              >
                Previous
              </Button>
              {step < 3 ? (
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
                  key="save-btn"
                  type="submit"
                  disabled={updateTripMutation.isPending}
                  className="px-10 h-12 bg-sunset-orange hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-900/20 font-bold gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateTripMutation.isPending ? t('common.saving', 'Saving Changes...') : t('common.save', 'Save Template')}
                </Button>
              )}
            </div>
          </div>

          {/* Preview Sidebar */}
          <div className="hidden lg:block">
             <div className="sticky top-24 space-y-4">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Live Preview</p>
                <Card className="border-none shadow-2xl overflow-hidden rounded-2xl dark:bg-slate-900 dark:border-slate-800 group scale-[0.9] origin-top">
                   <div className="relative h-48 bg-gray-200 dark:bg-slate-800">
                      {watchedImages[0] ? (
                        <img src={watchedImages[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
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
                   </CardContent>
                </Card>
             </div>
          </div>
        </div>
      </form>
    </div>
  );
}
