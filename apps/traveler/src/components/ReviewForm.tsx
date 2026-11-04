'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { Button, Textarea } from '@ouiboo/ui';
import { Star, Loader2, Check, AlertCircle, Camera, X } from 'lucide-react';
import { REVIEW_SUB_SCORES, type ReviewSubScoreKey } from '@/lib/review-display';

/** #776: mirrors MAX_REVIEW_PHOTOS on the API — each file also obeys
 * the API's 5MB upload cap. */
const MAX_REVIEW_PHOTOS = 3;

type SubScoreState = Record<ReviewSubScoreKey, number>;

/** #776: one sub-score star row (organisation / guide / value /
 * accuracy). Same radiogroup pattern as the overall rating. */
function SubScoreInput({
  scoreKey,
  label,
  value,
  onChange,
}: {
  scoreKey: ReviewSubScoreKey;
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center justify-between gap-4">
      <span id={`review-subscore-${scoreKey}-label`} className="text-sm font-medium text-foreground">
        {label}
      </span>
      <div className="flex gap-1" role="radiogroup" aria-labelledby={`review-subscore-${scoreKey}-label`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={t('reviewForm.ratingOption', { count: star })}
            onClick={() => onChange(value === star ? 0 : star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="focus:outline-none focus:ring-2 focus:ring-sunset-orange focus:ring-offset-2 rounded-full"
          >
            <Star
              className={`h-6 w-6 transition-all duration-200 cursor-pointer ${
                star <= (hovered || value)
                  ? 'fill-sunset-orange text-sunset-orange'
                  : 'text-muted-foreground/40'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
import { motion, AnimatePresence } from 'framer-motion';

interface ReviewFormProps {
  bookingId: string;
  onSuccess?: () => void;
}

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

export function ReviewForm({ bookingId, onSuccess }: ReviewFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [subScores, setSubScores] = useState<SubScoreState>({
    organisation: 0,
    guide: 0,
    value: 0,
    accuracy: 0,
  });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [comment, setComment] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const submitReviewMutation = useMutation({
    mutationFn: async (data: {
      rating: number;
      comment?: string;
      subScores: SubScoreState;
      files: File[];
    }) => {
      // #776: photos go FIRST through the private `review-photo`
      // upload intent; the review then references the returned
      // private storage keys. No public upload path is involved, and
      // the photos stay invisible until the review is approved.
      const photoKeys: string[] = [];
      for (const file of data.files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('intent', 'review-photo');
        const uploadResponse = await apiClient.post('/upload', formData);
        const key = (uploadResponse as { data?: { filename?: string } })?.data?.filename;
        if (!key) throw new Error('Upload did not return a file key');
        photoKeys.push(key);
      }
      const payload: Record<string, unknown> = {
        rating: data.rating,
        comment: data.comment,
      };
      for (const { key, field } of REVIEW_SUB_SCORES) {
        const value = data.subScores[key];
        if (value > 0) payload[field] = value;
      }
      if (photoKeys.length) payload.photoKeys = photoKeys;
      await apiClient.post(`/bookings/${bookingId}/review`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setSuccessMessage(t('reviewForm.success'));
      setRating(0);
      setSubScores({ organisation: 0, guide: 0, value: 0, accuracy: 0 });
      setPhotoFiles([]);
      setComment('');
      setTimeout(() => {
        setSuccessMessage('');
        onSuccess?.();
      }, 2000);
    },
    onError: (error: ApiError) => {
      setErrorMessage(error?.response?.data?.message || t('reviewForm.submitError'));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!rating) {
      setErrorMessage(t('reviewForm.ratingRequired'));
      return;
    }

    submitReviewMutation.mutate({
      rating,
      comment: comment || undefined,
      subScores,
      files: photoFiles,
    });
  };

  const handlePhotoSelection = (selected: FileList | null) => {
    if (!selected) return;
    const next = [...photoFiles, ...Array.from(selected)].slice(0, MAX_REVIEW_PHOTOS);
    if (photoFiles.length + selected.length > MAX_REVIEW_PHOTOS) {
      setErrorMessage(t('reviewForm.photosTooMany', { max: MAX_REVIEW_PHOTOS }));
    }
    setPhotoFiles(next);
  };

  const handleRatingKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, star: number) => {
    let nextRating: number | undefined;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') nextRating = Math.min(5, star + 1);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') nextRating = Math.max(1, star - 1);
    if (event.key === 'Home') nextRating = 1;
    if (event.key === 'End') nextRating = 5;
    if (nextRating === undefined) return;

    event.preventDefault();
    setRating(nextRating);
    document.getElementById(`review-rating-${nextRating}`)?.focus();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Section */}
        <div className="space-y-3">
          <p id="review-rating-label" className="text-sm font-bold text-foreground uppercase tracking-widest">
            {t('reviewForm.ratingLabel')}
          </p>
          <div className="flex gap-3" role="radiogroup" aria-labelledby="review-rating-label">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                id={`review-rating-${star}`}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={t('reviewForm.ratingOption', { count: star })}
                tabIndex={rating === 0 ? (star === 1 ? 0 : -1) : rating === star ? 0 : -1}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setRating(star)}
                onKeyDown={(event) => handleRatingKeyDown(event, star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none focus:ring-2 focus:ring-sunset-orange focus:ring-offset-2 rounded-full"
              >
                <Star
                  className={`h-10 w-10 transition-all duration-200 cursor-pointer ${
                    star <= (hoveredRating || rating)
                      ? 'fill-sunset-orange text-sunset-orange'
                      : 'text-muted-foreground/40'
                  }`}
                />
              </motion.button>
            ))}
          </div>
        </div>

        {/* #776: sub-scores — optional depth under the headline rating */}
        <div className="space-y-3">
          {REVIEW_SUB_SCORES.map(({ key }) => (
            <SubScoreInput
              key={key}
              scoreKey={key}
              label={t(`reviewForm.subScores.${key}`)}
              value={subScores[key]}
              onChange={(next) => setSubScores((prev) => ({ ...prev, [key]: next }))}
            />
          ))}
        </div>

        {/* #776: optional traveller photos via the private upload
            intent — replaces the #503 note below: the end-to-end,
            moderated media flow now exists, so the picker is back,
            wired to real storage instead of discarding the file. */}
        <div className="space-y-3">
          <label htmlFor="review-photos" className="text-sm font-bold text-foreground uppercase tracking-widest">
            {t('reviewForm.photosLabel')}
          </label>
          <p className="text-xs text-muted-foreground">
            {t('reviewForm.photosHint', { max: MAX_REVIEW_PHOTOS })}
          </p>
          <input
            id="review-photos"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={(e) => {
              handlePhotoSelection(e.target.files);
              e.target.value = '';
            }}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-border file:bg-background file:text-foreground file:font-medium"
          />
          {photoFiles.length > 0 && (
            <ul className="space-y-2">
              {photoFiles.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-3 text-sm text-foreground bg-muted/40 rounded-lg px-3 py-2"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Camera className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{file.name}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={t('reviewForm.photoRemove', { name: file.name })}
                    onClick={() => setPhotoFiles((prev) => prev.filter((_, i) => i !== index))}
                    className="shrink-0 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-sunset-orange rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Comment Section */}
        <div className="space-y-3">
          <label htmlFor="review-comment" className="text-sm font-bold text-foreground uppercase tracking-widest">
            {t('reviewForm.commentLabel')}
          </label>
          <Textarea
            id="review-comment"
            value={comment}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setComment(e.target.value);
              }
            }}
            placeholder={t('reviewForm.commentPlaceholder')}
            className="min-h-32 resize-none dark:bg-muted dark:border-border"
          />
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {t('reviewForm.characterCount', { count: comment.length, max: 500 })}
          </div>
        </div>

        {/* #503 history: the old picker silently discarded files and
            was removed until the moderated end-to-end flow existed.
            #776 built that flow (private intent + moderation-gated
            serving), so the picker above is the real affordance. */}

        {/* Messages */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="status"
              aria-live="polite"
              className="flex items-center gap-3 p-4 bg-success/10 rounded-xl border border-success/20"
            >
              <Check className="h-5 w-5 text-success dark:text-emerald-400" />
              <p className="font-medium text-success dark:text-emerald-300 text-sm">{successMessage}</p>
            </motion.div>
          )}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="alert"
              className="flex items-center gap-3 p-4 bg-danger/10 rounded-xl border border-danger/20"
            >
              <AlertCircle className="h-5 w-5 text-danger dark:text-red-400" />
              <p className="font-medium text-danger dark:text-red-300 text-sm">{errorMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <div className="pt-4 flex gap-3 justify-end">
          <Button
            type="submit"
            disabled={submitReviewMutation.isPending}
            className="h-12 px-8 bg-sunset-orange hover:bg-orange-600 border-none rounded-xl text-sm font-bold uppercase tracking-widest shadow-xl shadow-orange-900/10 disabled:opacity-70"
          >
            {submitReviewMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('reviewForm.submitting')}
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {t('reviewForm.submit')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

