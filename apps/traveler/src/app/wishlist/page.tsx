'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { TripCard } from '@/components/TripCard';
import { Button, Badge, EmptyState, TripCardSkeletonGrid } from '@ouiboo/ui';
import { Calendar } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useTranslation } from 'react-i18next';

type WishlistTrip = {
  category?: string;
  durationDays: number;
  id: string;
  images?: string[];
  sessions?: Array<{
    availableSeats: number;
    id: string;
    price: number;
    startDate: string;
    status: string;
  }>;
  startLocation?: string;
  title: string;
};

type WishlistResponse = {
  items: WishlistTrip[];
  pages: number;
  total: number;
};

export default function WishlistPage() {
  const [page, setPage] = useState(1);
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t, i18n } = useTranslation();

  const { data, isLoading } = useQuery<WishlistResponse>({
    queryKey: ['wishlist', page, i18n.language],
    queryFn: async () => {
      const res = await apiClient.get('/users/wishlist', { params: { page, limit: 20, locale: i18n.language } });
      return res.data;
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(user),
  });

  const wishlist = data?.items || [];
  const total = data?.total || 0;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-20">
      <div className="max-w-6xl mx-auto px-6 pt-32">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">{t('wishlistPage.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('wishlistPage.subtitle')}</p>
          </div>
          <Badge className="bg-card/90 px-3 py-1 rounded-full text-sm font-bold">{total}</Badge>
        </div>

        {isAuthLoading || isLoading ? (
          <div role="status" aria-label={t('wishlistPage.loading')}>
            <TripCardSkeletonGrid count={6} />
            <span className="sr-only">{t('wishlistPage.loading')}</span>
          </div>
        ) : !user ? (
          <div className="text-center py-28 bg-card/70 rounded-2xl border border-dashed border-border">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold">{t('wishlistPage.signedOutTitle')}</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              {t('wishlistPage.signedOutBody')}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
              <Link href="/login">{t('wishlistPage.signIn')}</Link>
            </Button>
              <Button asChild variant="outline">
              <Link href="/search">{t('wishlistPage.explore')}</Link>
            </Button>
            </div>
          </div>
        ) : wishlist.length === 0 ? (
          <EmptyState
            className="py-28"
            icon={<Calendar className="h-6 w-6" />}
            title={t('wishlistPage.emptyTitle')}
            description={t('wishlistPage.emptyBody')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlist.map((t) => (
              <TripCard key={t.id} trip={t} />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>{t('wishlistPage.previous')}</Button>
            <div className="text-sm text-muted-foreground">{t('wishlistPage.pageOf', { page, total: data.pages })}</div>
            <Button disabled={page === data.pages} onClick={() => setPage(p => Math.min(data.pages, p + 1))}>{t('wishlistPage.next')}</Button>
          </div>
        )}
      </div>
    </div>
  );
}

