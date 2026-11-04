/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReviewList } from './ReviewList';

const mockReviewWithVideo = {
    id: 'rev-1',
    rating: 5,
    comment: 'Wonderful day',
    photos: ['/trips/trip-1/reviews/rev-1/photos/0'],
    video: '/trips/trip-1/reviews/rev-1/video',
    isVerifiedBooking: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    traveler: { id: 't-1', name: 'Sara', avatar: undefined },
};

const mockReviewWithoutVideo = {
    ...mockReviewWithVideo,
    id: 'rev-2',
    video: null,
};

let mockReviews: unknown[] = [mockReviewWithVideo];

jest.mock('@tanstack/react-query', () => ({
    useQuery: () => ({
        data: { reviews: mockReviews, total: mockReviews.length, pages: 1 },
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

describe('ReviewList video review (#783)', () => {
    it('renders the video with native controls through the visibility-gated API path', () => {
        mockReviews = [mockReviewWithVideo];
        const { container } = render(<ReviewList tripId="trip-1" />);
        const video = container.querySelector('video');
        expect(video).toBeTruthy();
        expect(video!.getAttribute('src')).toContain('/trips/trip-1/reviews/rev-1/video');
        // Never a private storage key or a direct private URL.
        expect(video!.getAttribute('src')).not.toContain('review-videos');
        expect(video!.hasAttribute('controls')).toBe(true);
        expect(video!.getAttribute('preload')).toBe('metadata');
        expect(screen.getByLabelText('reviews.videoAlt')).toBeTruthy();
    });

    it('renders no video element for a review without one', () => {
        mockReviews = [mockReviewWithoutVideo];
        const { container } = render(<ReviewList tripId="trip-1" />);
        expect(container.querySelector('video')).toBeNull();
        // Photos still render as before (#776 unchanged).
        expect(container.querySelectorAll('img')).toHaveLength(1);
    });
});
