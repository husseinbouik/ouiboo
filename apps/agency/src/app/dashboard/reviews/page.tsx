'use client';

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Button,
  Input,
  Textarea,
  Badge
} from '@ouiboo/ui';
import { 
  Search, 
  Star, 
  Loader2,
  MessageCircle,
  Check,
  AlertCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { Review } from '@ouiboo/types';

type AgencyReview = Review & {
  traveler?: {
    name?: string;
  };
  trip?: {
    title?: string;
  };
};

type ReviewsResponse = {
  reviews: AgencyReview[];
};

type ReviewStats = {
  totalReviews: number;
  averageRating?: number;
  pendingResponses: number;
  responseRate: number;
};

export default function ReviewsManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'responded'>('all');
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);

  const { data: reviews, isLoading } = useQuery<ReviewsResponse>({
    queryKey: ['agency-reviews', filterStatus, searchTerm],
    queryFn: async () => {
      const response = await apiClient.get('/agency/reviews', {
        params: {
          filterStatus: filterStatus === 'all' ? undefined : filterStatus,
          search: searchTerm || undefined
        }
      });
      return response.data;
    }
  });

  const { data: stats } = useQuery<ReviewStats>({
    queryKey: ['agency-reviews-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/reviews/stats');
      return response.data;
    }
  });

  const respondMutation = useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      await apiClient.post(`/reviews/${reviewId}/response`, { response });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['agency-reviews-stats'] });
      setIsResponseModalOpen(false);
      setSelectedReviewId(null);
      setResponseText('');
    }
  });

  const handleOpenResponse = (review: AgencyReview) => {
    setSelectedReviewId(review.id);
    setResponseText(review.response || '');
    setIsResponseModalOpen(true);
  };

  const handleSubmitResponse = () => {
    if (!selectedReviewId || !responseText.trim()) return;
    respondMutation.mutate({
      reviewId: selectedReviewId,
      response: responseText
    });
  };

  const filteredReviews = reviews?.reviews || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-deep-blue dark:text-gray-100">Reviews Manager</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor guest feedback and respond to reviews.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Reviews</p>
              <p className="text-3xl font-bold text-deep-blue dark:text-gray-100 mt-2">{stats?.totalReviews || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Star className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Rating</p>
              <p className="text-3xl font-bold text-deep-blue dark:text-gray-100 mt-2">{stats?.averageRating?.toFixed(1) || '0'}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
              <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Responses</p>
              <p className="text-3xl font-bold text-deep-blue dark:text-gray-100 mt-2">{stats?.pendingResponses || 0}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Response Rate</p>
              <p className="text-3xl font-bold text-deep-blue dark:text-gray-100 mt-2">{stats?.responseRate || 0}%</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
              <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search by traveler name or trip title..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 dark:bg-slate-800 dark:border-slate-700"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'responded')}
            className="h-11 px-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-deep-blue"
          >
            <option value="all">All Reviews</option>
            <option value="pending">Pending Response</option>
            <option value="responded">Responded</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <Card className="border-none shadow-sm overflow-hidden dark:bg-slate-900 border dark:border-slate-800">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-deep-blue" />
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <Star className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground">No reviews found</h3>
              <p className="text-muted-foreground mt-1">Reviews from your guests will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-800 text-gray-700 dark:text-gray-300 uppercase text-[11px] font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Traveler & Trip</th>
                    <th className="px-6 py-4">Rating</th>
                    <th className="px-6 py-4">Comment</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Response Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  <AnimatePresence mode="popLayout">
                    {filteredReviews.map((review, idx: number) => (
                      <motion.tr
                        key={review.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-foreground">{review.traveler?.name || 'Anonymous'}</p>
                            <p className="text-xs text-muted-foreground">{review.trip?.title}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                            ))}
                            <span className="ml-2 font-bold text-foreground">{review.rating}.0</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-foreground line-clamp-2">
                            {review.comment || '—'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(review.createdAt), 'MMM dd, yyyy')}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {review.response ? (
                            <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-400/20">
                              <Check className="h-3 w-3 mr-1" /> Responded
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-400/20">
                              <AlertCircle className="h-3 w-3 mr-1" /> Pending
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenResponse(review)}
                            className="dark:border-slate-700 dark:text-gray-300"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" /> Respond
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Modal */}
      {isResponseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-background rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Respond to Review</h2>
              <p className="text-muted-foreground">Share your response to this guest review</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-foreground uppercase tracking-widest mb-3 block">Your Response</label>
                <Textarea
                  value={responseText}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setResponseText(e.target.value);
                    }
                  }}
                  placeholder="Thank you for your feedback..."
                  className="min-h-32 resize-none dark:bg-slate-800 dark:border-slate-700"
                />
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">
                  {responseText.length} / 500 characters
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border/50">
                <Button
                  variant="outline"
                  onClick={() => setIsResponseModalOpen(false)}
                  className="h-11 px-6 dark:border-slate-700 dark:text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitResponse}
                  disabled={respondMutation.isPending || !responseText.trim()}
                  className="h-11 px-6 bg-sunset-orange hover:bg-orange-600 border-none text-white font-bold uppercase tracking-widest disabled:opacity-70"
                >
                  {respondMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Submit Response
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsResponseModalOpen(false)}
            className="fixed inset-0 -z-10"
            aria-label="Close dialog"
          />
        </div>
      )}
    </div>
  );
}
