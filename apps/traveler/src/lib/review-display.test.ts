import {
    MIN_REVIEWS_FOR_RATING,
    ratingDisplayState,
    shouldShowRating,
    REVIEW_SUB_SCORES,
    shouldShowSubScoreAverages,
} from './review-display';

describe('review claim thresholds (#681)', () => {
    it('documents the stated minimum: 5 reviews', () => {
        expect(MIN_REVIEWS_FOR_RATING).toBe(5);
    });

    it('classifies the zero state as empty', () => {
        expect(ratingDisplayState(0)).toBe('empty');
        expect(ratingDisplayState(null)).toBe('empty');
        expect(ratingDisplayState(undefined)).toBe('empty');
        expect(shouldShowRating(0)).toBe(false);
    });

    it('hides averages below the threshold while keeping counts publishable', () => {
        for (const count of [1, 2, 3, 4]) {
            expect(ratingDisplayState(count)).toBe('below-threshold');
            expect(shouldShowRating(count)).toBe(false);
        }
    });

    it('shows averages at and above the threshold', () => {
        expect(ratingDisplayState(5)).toBe('rated');
        expect(ratingDisplayState(42)).toBe('rated');
        expect(shouldShowRating(5)).toBe(true);
    });
});

describe('review sub-scores (#776)', () => {
    it('fixes the four sub-scores to their review fields', () => {
        expect(REVIEW_SUB_SCORES.map(({ key, field }) => [key, field])).toEqual([
            ['organisation', 'organisationRating'],
            ['guide', 'guideRating'],
            ['value', 'valueRating'],
            ['accuracy', 'accuracyRating'],
        ]);
    });

    it('gates sub-score averages on the same threshold as the overall average', () => {
        for (const count of [0, 1, 4]) {
            expect(shouldShowSubScoreAverages(count)).toBe(false);
        }
        expect(shouldShowSubScoreAverages(5)).toBe(true);
        expect(shouldShowSubScoreAverages(12)).toBe(true);
    });
});
