'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button, Textarea } from '@ouiboo/ui';
import { Star, Loader2, Check, AlertCircle } from 'lucide-react';
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
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const submitReviewMutation = useMutation({
    mutationFn: async (data: { rating: number; comment?: string }) => {
      await apiClient.post(`/bookings/${bookingId}/review`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setSuccessMessage('Review submitted successfully!');
      setRating(0);
      setComment('');
      setTimeout(() => {
        setSuccessMessage('');
        onSuccess?.();
      }, 2000);
    },
    onError: (error: ApiError) => {
      setErrorMessage(error?.response?.data?.message || 'Failed to submit review');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      setErrorMessage('Please select a rating');
      return;
    }

    submitReviewMutation.mutate({
      rating,
      comment: comment || undefined
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Section */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-foreground uppercase tracking-widest">Rate Your Experience</label>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                type="button"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setRating(star)}
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

        {/* Comment Section */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-foreground uppercase tracking-widest">Your Review (Optional)</label>
          <Textarea
            value={comment}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setComment(e.target.value);
              }
            }}
            placeholder="Share your experience with this trip..."
            className="min-h-32 resize-none dark:bg-muted dark:border-border"
          />
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {comment.length} / 500 characters
          </div>
        </div>

        {/* #503: no photo affordance — the review endpoint accepts only
            rating + comment, and the previous picker silently discarded the
            selected file. Removed (Council B20) until an end-to-end,
            moderated media flow exists. */}

        {/* Messages */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
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
                Submitting...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Submit Review
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

