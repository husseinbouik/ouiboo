'use client';

import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * #587: rating-distribution rows for the trip page review summary.
 * Each row is labelled with the rating number plus a star icon —
 * the previous inline markup rendered `{rating}?` literally, so
 * travellers saw e.g. "5?" next to every bar. Extracted from
 * TripDetailsClient so the rendered label is pinned by a component
 * test (RatingDistribution.test.tsx).
 */
export function RatingDistribution({
  distribution,
  totalReviews,
}: {
  distribution?: Record<number, number>;
  totalReviews: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((rating) => {
        const count = distribution?.[rating] || 0;
        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
        return (
          <div key={rating} className="flex items-center gap-2">
            <span
              className="flex w-6 items-center gap-0.5 text-xs font-bold text-muted-foreground"
              aria-label={t('tripDetails.distributionRating', { count: rating })}
            >
              <span aria-hidden="true">{rating}</span>
              <Star className="h-3 w-3 fill-sunset-orange text-sunset-orange" aria-hidden="true" />
            </span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sunset-orange to-orange-600"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground w-8 text-end">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
