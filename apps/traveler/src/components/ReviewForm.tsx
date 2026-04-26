'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button, Textarea } from '@ouiboo/ui';
import { Star, Upload, Loader2, Check, AlertCircle } from 'lucide-react';
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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
      setUploadedFile(null);
      setTimeout(() => {
        setSuccessMessage('');
        onSuccess?.();
      }, 2000);
    },
    onError: (error: ApiError) => {
      setErrorMessage(error?.response?.data?.message || 'Failed to submit review');
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file);
      setErrorMessage('');
    } else {
      setErrorMessage('Please select a valid image file');
    }
  };

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
                      : 'text-gray-300 dark:text-gray-600'
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
            className="min-h-32 resize-none dark:bg-slate-800 dark:border-slate-700"
          />
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {comment.length} / 500 characters
          </div>
        </div>

        {/* Photo Upload Section */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-foreground uppercase tracking-widest">Add Photo (Optional)</label>
          <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            {uploadedFile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-sunset-orange/10 rounded-lg flex items-center justify-center">
                    <Check className="h-6 w-6 text-sunset-orange" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground text-sm">{uploadedFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  className="text-red-500 hover:text-red-600 font-bold text-sm"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Upload className="h-6 w-6 text-blue-500" />
                  </div>
                  <p className="font-semibold text-foreground text-sm">Click to upload image</p>
                  <p className="text-[10px] text-muted-foreground">JPG, PNG, WebP (Max 10MB)</p>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-xl border border-emerald-200 dark:border-emerald-500/20"
            >
              <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <p className="font-medium text-emerald-700 dark:text-emerald-300 text-sm">{successMessage}</p>
            </motion.div>
          )}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-500/5 rounded-xl border border-red-200 dark:border-red-500/20"
            >
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="font-medium text-red-700 dark:text-red-300 text-sm">{errorMessage}</p>
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
