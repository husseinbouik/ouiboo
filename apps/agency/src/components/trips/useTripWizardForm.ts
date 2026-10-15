import React, { useState } from 'react';
import {
  useForm,
  useFieldArray,
  type UseFormProps,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTripTemplateSchema, type CreateTripInput } from '@ouiboo/schemas';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { useStringArrayField } from '@/hooks/useStringArrayField';

type ApiError = {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
  message?: string;
};

export type UseTripWizardFormOptions = {
  /** Pre-filled values (create page). Edit page loads via reset() instead. */
  defaultValues?: UseFormProps<CreateTripInput>['defaultValues'];
  /** Enforce the 5MB image size limit (create page only). */
  validateImageSize?: boolean;
  /** Show translated upload errors in UI (create) vs console.error (edit). */
  translateUploadErrors?: boolean;
};

/**
 * Shared state + logic for the agency trip create/edit wizards.
 * Owns the react-hook-form instance, the 4 wizard steps, field arrays,
 * image upload, and per-step validation. Pure refactor of the logic that
 * was duplicated across create/page.tsx and [id]/edit/page.tsx (#189).
 */
export function useTripWizardForm(options: UseTripWizardFormOptions = {}) {
  const { defaultValues, validateImageSize = false, translateUploadErrors = false } = options;
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [validating, setValidating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submissionError, setSubmissionError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    reset,
    formState: { errors },
  } = useForm<CreateTripInput>({
    resolver: zodResolver(CreateTripTemplateSchema),
    // Revalidate on change so errors clear as the user fixes them (#72)
    reValidateMode: 'onChange',
    ...(defaultValues ? { defaultValues } : {}),
  });

  const inclusions = useStringArrayField(control, setValue, 'inclusions');
  const exclusions = useStringArrayField(control, setValue, 'exclusions');
  const checklist = useStringArrayField(control, setValue, 'checklist');

  const { fields: itineraryFields, append: appendDay } = useFieldArray({
    control,
    name: 'itinerary',
  });

  const watchedImages = watch('images') || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    // Check file size (5MB limit) — create page only
    if (validateImageSize && file.size > 5 * 1024 * 1024) {
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
      if (translateUploadErrors) {
        const apiError = error as ApiError;
        const message = apiError.response?.data?.message || apiError.message || '';
        setUploadError(
          t('trips.create.uploadFailed', {
            message: Array.isArray(message) ? message.join(', ') : message,
          }),
        );
      } else {
        console.error('Upload failed:', error);
      }
    } finally {
      setUploading(false);
    }
  };

  const nextStep = async () => {
    if (validating) return;
    setValidating(true);
    try {
      let fieldsToValidate: Array<keyof CreateTripInput | 'itinerary'> = [];
      if (step === 1)
        fieldsToValidate = [
          'title',
          'description',
          'category',
          'startLocation',
          'durationDays',
          'durationNights',
        ];
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
        setStep((s) => s + 1);
      }
    } finally {
      setValidating(false);
    }
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  return {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    reset,
    errors,
    step,
    validating,
    nextStep,
    prevStep,
    inclusions,
    exclusions,
    checklist,
    itineraryFields,
    appendDay,
    watchedImages,
    uploading,
    uploadError,
    submissionError,
    setSubmissionError,
    handleFileUpload,
  };
}

export type TripWizardFormApi = ReturnType<typeof useTripWizardForm>;
