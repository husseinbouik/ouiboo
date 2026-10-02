'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Badge, Button } from '@ouiboo/ui';
import { Star, Loader2, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface ReviewListProps {
  tripId: string;
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  response?: string;
  isVerifiedBooking: boolean;
  createdAt: string;
  traveler?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

type SortBy = 'recent' | 'highest' | 'lowest';

type ReviewListResponse = {
  reviews: Review[];
  total: number;
  pages: number;
};

export function ReviewList({ tripId }: ReviewListProps) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [expandedReviewIds, setExpandedReviewIds] = useState<Set<string>>(new Set());

  const { data: reviewsData, isLoading } = useQuery<ReviewListResponse>({
    queryKey: ['trip-reviews', tripId, page, sortBy],
    queryFn: async () => {
      const response = await apiClient.get(`/trips/${tripId}/reviews`, {
        params: {
          page,
          limit: 10,
          sortBy
        }
      });
      return response.data;
    }
  });

  const toggleExpanded = (reviewId: string) => {
    const newSet = new Set(expandedReviewIds);
    if (newSet.has(reviewId)) {
      newSet.delete(reviewId);
    } else {
      newSet.add(reviewId);
    }
    setExpandedReviewIds(newSet);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-sunset-orange" />
      </div>
    );
  }

  const reviews = reviewsData?.reviews || [];
  const totalReviews = reviewsData?.total || 0;
  const totalPages = reviewsData?.pages || 1;

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 bg-card/70 rounded-2xl border border-dashed border-border">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground">No reviews yet</h3>
        <p className="text-muted-foreground mt-2">Be the first to share your experience!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortBy);
              setPage(1);
            }}
            className="h-10 px-4 rounded-lg border border-border/50 bg-background text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-sunset-orange dark:bg-muted dark:border-border"
          >
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        </div>
        <span className="text-sm text-muted-foreground font-medium">
          {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
        </span>
      </div>

      {/* Reviews Cards */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {reviews.map((review: Review, idx: number) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sunset-orange to-orange-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {review.traveler?.name?.charAt(0).toUpperCase() || 'T'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-foreground">{review.traveler?.name || 'Anonymous'}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {format(new Date(review.createdAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 justify-end">
                  {review.isVerifiedBooking && (
                    <Badge className="bg-success/100/10 text-success dark:text-emerald-400 border border-success/20 dark:border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-bold">
                      Verified Booking
                    </Badge>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= review.rating
                          ? 'fill-sunset-orange text-sunset-orange'
                          : 'text-muted-foreground/40'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-bold text-foreground ml-2">{review.rating}.0</span>
              </div>

              {/* Comment */}
              {review.comment && (
                <div>
                  <p className="text-foreground text-sm leading-relaxed">
                    {expandedReviewIds.has(review.id) || review.comment.length <= 200
                      ? review.comment
                      : `${review.comment.substring(0, 200)}...`}
                  </p>
                  {review.comment.length > 200 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(review.id)}
                      className="mt-2 text-sunset-orange hover:text-orange-600 h-auto p-0 font-bold text-xs uppercase tracking-widest"
                    >
                      {expandedReviewIds.has(review.id) ? 'Show less' : 'Read more'}
                    </Button>
                  )}
                </div>
              )}

              {/* Agency Response */}
              <AnimatePresence>
                {review.response && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-4 border-t border-border/50 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-ocean-500/10 flex items-center justify-center shrink-0">
                        <MessageCircle className="h-3.5 w-3.5 text-ocean-600 dark:text-ocean-300 dark:text-blue-400" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Agency Response
                      </span>
                    </div>
                    <p className="text-foreground text-sm leading-relaxed bg-ocean-500/10 rounded-xl p-3 border border-ocean-500/20">
                      {review.response}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pt-6 border-t border-border/50 flex items-center justify-between">
          <div className="text-sm text-muted-foreground font-medium">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-10 px-6 text-sm font-bold uppercase tracking-widest"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="h-10 px-6 text-sm font-bold uppercase tracking-widest"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

