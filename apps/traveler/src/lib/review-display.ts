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

/**
 * #776 (Council S6 Phase 3): the four review sub-scores. `key` is the
 * stats/locale key; `field` is the review column / DTO field. The
 * overall rating stays the headline — sub-scores add depth only.
 */
export const REVIEW_SUB_SCORES = [
    { key: 'organisation', field: 'organisationRating' },
    { key: 'guide', field: 'guideRating' },
    { key: 'value', field: 'valueRating' },
    { key: 'accuracy', field: 'accuracyRating' },
] as const;

export type ReviewSubScoreKey = (typeof REVIEW_SUB_SCORES)[number]['key'];

/**
 * #776 + #681: sub-score AVERAGES obey the same threshold discipline
 * as the overall average — hidden below MIN_REVIEWS_FOR_RATING,
 * shown at/above it. (Individual scores on a visible review are part
 * of that review's content, not an aggregate claim.)
 */
export function shouldShowSubScoreAverages(reviewCount?: number | null): boolean {
    return shouldShowRating(reviewCount);
}
