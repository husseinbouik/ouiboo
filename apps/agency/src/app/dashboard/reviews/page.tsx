'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatLocalDate } from '@ouiboo/utils';
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
  const { t, i18n } = useTranslation();
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
          <h1 className="text-3xl font-bold text-foreground">{t('reviews.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('reviews.subtitle')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('reviews.statTotal')}</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats?.totalReviews || 0}</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Star className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('reviews.statAvg')}</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats?.averageRating?.toFixed(1) || '0'}</p>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
              <Star className="h-6 w-6 fill-warning text-warning" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('reviews.statPending')}</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats?.pendingResponses || 0}</p>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-warning" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('reviews.statResponseRate')}</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats?.responseRate || 0}%</p>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <Check className="h-6 w-6 text-success" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl shadow-sm border border-border transition-colors">
        <div className="relative flex-1 w-full">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('reviews.searchPlaceholder')}
            aria-label={t('reviews.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ps-10 h-11"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'responded')}
            aria-label={t('reviews.filterAll')}
            className="h-11 px-4 rounded-lg border border-border bg-card text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">{t('reviews.filterAll')}</option>
            <option value="pending">{t('reviews.filterPending')}</option>
            <option value="responded">{t('reviews.filterResponded')}</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <Card className="border-none shadow-sm overflow-hidden bg-card border border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <Star className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground">{t('reviews.emptyTitle')}</h3>
              <p className="text-muted-foreground mt-1">{t('reviews.emptyBody')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[11px] font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">{t('reviews.colTraveler')}</th>
                    <th className="px-6 py-4">{t('reviews.colRating')}</th>
                    <th className="px-6 py-4">{t('reviews.colComment')}</th>
                    <th className="px-6 py-4">{t('reviews.colDate')}</th>
                    <th className="px-6 py-4">{t('reviews.colResponse')}</th>
                    <th className="px-6 py-4 text-end">{t('reviews.colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <AnimatePresence mode="popLayout">
                    {filteredReviews.map((review, idx: number) => (
                      <motion.tr
                        key={review.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-foreground">{review.traveler?.name || t('reviews.anonymous')}</p>
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
                                    ? 'fill-warning text-warning'
                                    : 'text-muted-foreground/40'
                                }`}
                              />
                            ))}
                            <span className="ms-2 font-bold text-foreground">{review.rating}.0</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-foreground line-clamp-2">
                            {review.comment || '—'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-muted-foreground">
                            {formatLocalDate(review.createdAt, i18n.language, { dateStyle: 'medium' })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {review.response ? (
                            <Badge className="bg-success/10 text-success ring-success/20">
                              <Check className="h-3 w-3 me-1" /> {t('reviews.responded')}
                            </Badge>
                          ) : (
                            <Badge className="bg-warning/10 text-warning ring-warning/20">
                              <AlertCircle className="h-3 w-3 me-1" /> {t('reviews.pending')}
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenResponse(review)}
                          >
                            <MessageCircle className="h-4 w-4 me-2" /> {t('reviews.respond')}
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
          <div className="bg-card rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">{t('reviews.modalTitle')}</h2>
              <p className="text-muted-foreground">{t('reviews.modalSubtitle')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-foreground uppercase tracking-widest mb-3 block">{t('reviews.yourResponse')}</label>
                <Textarea
                  value={responseText}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setResponseText(e.target.value);
                    }
                  }}
                  placeholder={t('reviews.responsePlaceholder')}
                  className="min-h-32 resize-none"
                />
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">
                  {t('reviews.charCount', { count: responseText.length })}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border/50">
                <Button
                  variant="outline"
                  onClick={() => setIsResponseModalOpen(false)}
                  className="h-11 px-6"
                >
                  {t('reviews.cancel')}
                </Button>
                <Button
                  onClick={handleSubmitResponse}
                  disabled={respondMutation.isPending || !responseText.trim()}
                  className="h-11 px-6 bg-accent text-accent-foreground hover:bg-accent/90 border-none font-bold uppercase tracking-widest disabled:opacity-70"
                >
                  {respondMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      {t('reviews.submitting')}
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 me-2" />
                      {t('reviews.submit')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsResponseModalOpen(false)}
            className="fixed inset-0 -z-10"
            aria-label={t('reviews.closeDialog')}
          />
        </div>
      )}
    </div>
  );
}
