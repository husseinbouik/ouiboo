/**
 * #681 (Council S6): review claim thresholds.
 *
 * An average rating or a rating distribution is a statistical claim, and
 * on a handful of reviews it misleads more than it informs. Ouiboo only
 * displays an average/distribution once a trip has at least
 * MIN_REVIEWS_FOR_RATING reviews. Review COUNTS are always published,
 * even when small, and the zero state states the integrity rule
 * explicitly (no imported, bought or seeded reviews — every review
 * comes from a completed trip).
 */
export const MIN_REVIEWS_FOR_RATING = 5;

export type RatingDisplayState = 'empty' | 'below-threshold' | 'rated';

export function ratingDisplayState(reviewCount?: number | null): RatingDisplayState {
    const count = reviewCount ?? 0;
    if (count <= 0) return 'empty';
    if (count < MIN_REVIEWS_FOR_RATING) return 'below-threshold';
    return 'rated';
}

export function shouldShowRating(reviewCount?: number | null): boolean {
    return ratingDisplayState(reviewCount) === 'rated';
}
