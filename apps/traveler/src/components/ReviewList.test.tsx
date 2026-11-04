/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReviewList } from './ReviewList';

jest.mock('@tanstack/react-query', () => ({
    useQuery: () => ({ data: { reviews: [], total: 0, pages: 1 }, isLoading: false }),
}));

jest.mock('@/lib/api-client', () => ({
    apiClient: { get: jest.fn() },
}));

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            if (key === 'reviews.noReviewsYet') return 'No reviews yet';
            if (key === 'reviews.emptyIntegrity')
                return 'No reviews yet — we never import, buy or seed reviews; every Ouiboo review comes from a completed trip.';
            if (key === 'reviews.beFirst') return 'Be the first to share your experience!';
            return key;
        },
        i18n: { language: 'en' },
    }),
}));

describe('ReviewList empty state (#681)', () => {
    it('states the integrity rule explicitly at zero reviews', () => {
        render(<ReviewList tripId="trip-1" />);
        expect(screen.getByText('No reviews yet')).not.toBeNull();
        expect(
            screen.getByText(
                'No reviews yet — we never import, buy or seed reviews; every Ouiboo review comes from a completed trip.',
            ),
        ).not.toBeNull();
    });
});
