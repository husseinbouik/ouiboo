'use client';

import React, { useState } from 'react';
import { 
  MapPin, 
  Clock, 
  Plus, 
  Image as ImageIcon,
  Check,
  ChevronLeft,
  Info,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Button, Input, Card, CardContent } from '@ouiboo/ui';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTripTemplateSchema, type CreateTripInput } from '@ouiboo/schemas';
import { apiClient } from '@/lib/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

export default function CreateTripPage() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<CreateTripInput>({
    resolver: zodResolver(CreateTripTemplateSchema),
    defaultValues: {
      category: 'Adventure',
      inclusions: [],
      images: [],
      status: 'Draft',
      durationDays: 1,
      durationNights: 0,
    } as any
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'inclusions' as any
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

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const currentImages = watch('images') || [];
      setValue('images', [...currentImages, response.data.url]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const onSubmit = (data: any) => {
    if (step < 3) {
      nextStep();
    } else {
      createTripMutation.mutate(data);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/trips" className="flex items-center gap-2 text-sm text-gray-500 hover:text-deep-blue transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Trips
        </Link>
        <div className="flex gap-2">
           {[1, 2, 3].map((i) => (
             <div key={i} className={`h-1.5 w-8 rounded-full transition-all duration-300 ${i <= step ? "bg-deep-blue" : "bg-gray-200"}`}></div>
           ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-deep-blue">
            {step === 1 && "Basic Information"}
            {step === 2 && "Media & Gallery"}
            {step === 3 && "Settings & Meta"}
          </h1>
          <p className="text-gray-500 mt-2">Fill in the details to create your travel package.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {step === 1 && (
              <section className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Trip Title</label>
                    <Input {...register('title')} placeholder="e.g. 5 Days in the Sahara Desert" className="h-12" />
                    {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Description</label>
                    <textarea 
                      {...register('description')}
                      className="w-full h-32 p-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-deep-blue/5 focus:border-deep-blue transition-all"
                      placeholder="Describe the unique experience..."
                    ></textarea>
                    {errors.description && <p className="text-red-500 text-xs">{errors.description.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Category</label>
                      <select {...register('category')} className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none">
                        <option value="Adventure">Adventure</option>
                        <option value="Cultural">Cultural</option>
                        <option value="Luxury">Luxury</option>
                        <option value="Budget">Budget</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Starting Location</label>
                      <Input {...register('startLocation')} placeholder="City, Country" className="h-12" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Days</label>
                      <Input type="number" {...register('durationDays', { valueAsNumber: true })} className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Nights</label>
                      <Input type="number" {...register('durationNights', { valueAsNumber: true })} className="h-12" />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {watchedImages.map((img, idx) => (
                      <div key={idx} className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden group">
                        <img src={img} className="w-full h-full object-cover" alt="" />
                        <button 
                          type="button"
                          onClick={() => {
                            const newImages = [...watchedImages];
                            newImages.splice(idx, 1);
                            setValue('images', newImages);
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus className="h-4 w-4 rotate-45" />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-video border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-sunset-orange bg-gray-50 transition-colors">
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                      {uploading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sunset-orange"></div>
                      ) : (
                        <>
                          <Plus className="h-6 w-6 text-gray-400" />
                          <span className="text-xs text-gray-500 mt-1">Add Image</span>
                        </>
                      )}
                    </label>
                  </div>
                  {errors.images && <p className="text-red-500 text-xs">{errors.images.message}</p>}
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700">What's Included</label>
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex gap-2">
                          <Input {...register(`inclusions.${index}` as any)} className="h-12" />
                          <Button type="button" variant="outline" onClick={() => remove(index)}>Remove</Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={() => append("")} className="w-full">
                        <Plus className="h-4 w-4 mr-2" /> Add Inclusion
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 pt-4">
                    <label className="text-sm font-semibold text-gray-700">Status</label>
                    <div className="flex gap-4">
                      {['Draft', 'Active'].map((s) => (
                        <label key={s} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" value={s} {...register('status')} className="text-deep-blue" />
                          <span className="text-sm font-medium">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className="pt-8 border-t border-gray-100 flex items-center justify-between">
              <Button 
                type="button"
                variant="outline" 
                onClick={prevStep}
                disabled={step === 1}
                className="px-8 h-12"
              >
                Previous
              </Button>
              <Button 
                type="submit"
                disabled={createTripMutation.isPending}
                className="px-10 h-12 bg-sunset-orange hover:bg-orange-600 border-none shadow-lg shadow-orange-900/20"
              >
                {step === 3 ? (createTripMutation.isPending ? 'Publishing...' : 'Publish Trip') : 'Continue'}
              </Button>
            </div>
          </div>

          {/* Preview Sidebar */}
          <div className="hidden lg:block">
             <div className="sticky top-24 space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Preview</p>
                <Card className="border-none shadow-xl overflow-hidden rounded-2xl">
                   <div className="relative h-48 bg-gray-200">
                      {watchedImages[0] ? (
                        <img src={watchedImages[0]} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                           <ImageIcon className="h-12 w-12" />
                        </div>
                      )}
                   </div>
                   <CardContent className="p-6 space-y-4">
                      <div className="space-y-2">
                         <p className="text-xs font-bold text-sunset-orange uppercase">{watch('category')}</p>
                         <h3 className="font-bold text-deep-blue line-clamp-1">{watch('title') || 'Untitled Adventure'}</h3>
                      </div>
                      <div className="flex items-center gap-4 py-4 border-y border-gray-50">
                         <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-xs text-gray-600">{watch('durationDays')}D/{watch('durationNights')}N</span>
                         </div>
                         <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-xs text-gray-600 truncate max-w-[80px]">{watch('startLocation') || 'TBD'}</span>
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
