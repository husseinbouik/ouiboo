/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReviewList } from './ReviewList';

const reviewWithDepth = {
    id: 'rev-1',
    rating: 5,
    comment: 'Wonderful day',
    organisationRating: 5,
    guideRating: 4,
    valueRating: null,
    accuracyRating: 3,
    photos: ['/trips/trip-1/reviews/rev-1/photos/0', '/trips/trip-1/reviews/rev-1/photos/1'],
    isVerifiedBooking: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    traveler: { id: 't-1', name: 'Sara', avatar: undefined },
};

jest.mock('@tanstack/react-query', () => ({
    useQuery: () => ({
        data: { reviews: [reviewWithDepth], total: 1, pages: 1 },
        isLoading: false,
    }),
}));

jest.mock('@/lib/api-client', () => ({
    apiClient: { get: jest.fn() },
}));

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, opts?: { count?: number }) =>
            opts?.count !== undefined ? `${key}:${opts.count}` : key,
        i18n: { language: 'en' },
    }),
}));

describe('ReviewList review depth (#776)', () => {
    it('renders the review sub-scores that were given (and skips null ones)', () => {
        render(<ReviewList tripId="trip-1" />);
        expect(screen.getByText('reviews.subScores.organisation')).toBeTruthy();
        expect(screen.getByText('reviews.subScores.guide')).toBeTruthy();
        expect(screen.getByText('reviews.subScores.accuracy')).toBeTruthy();
        expect(screen.queryByText('reviews.subScores.value')).toBeNull();
    });

    it('renders traveller photos through the visibility-gated API paths', () => {
        const { container } = render(<ReviewList tripId="trip-1" />);
        const images = container.querySelectorAll('img');
        expect(images).toHaveLength(2);
        expect(images[0].getAttribute('src')).toContain(
            '/trips/trip-1/reviews/rev-1/photos/0',
        );
        expect(images[1].getAttribute('src')).toContain(
            '/trips/trip-1/reviews/rev-1/photos/1',
        );
        // Never a private storage key or a direct private URL.
        expect(images[0].getAttribute('src')).not.toContain('review-photos');
        expect(images[0].getAttribute('alt')).toBe('reviews.photoAlt');
    });
});
