/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewForm } from './ReviewForm';

const mockPost = jest.fn();
jest.mock('@/lib/api-client', () => ({
    apiClient: { post: (...args: unknown[]) => mockPost(...args) },
}));

function renderForm() {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <ReviewForm bookingId="booking-1" />
        </QueryClientProvider>,
    );
}

describe('ReviewForm review depth (#776)', () => {
    beforeEach(() => {
        mockPost.mockReset();
        mockPost.mockResolvedValue({ data: {} });
    });

    it('renders four sub-score radiogroups under the overall rating', () => {
        renderForm();
        // overall + organisation + guide + value + accuracy
        expect(screen.getAllByRole('radiogroup')).toHaveLength(5);
        expect(screen.getByText('reviewForm.subScores.organisation')).toBeTruthy();
        expect(screen.getByText('reviewForm.subScores.guide')).toBeTruthy();
        expect(screen.getByText('reviewForm.subScores.value')).toBeTruthy();
        expect(screen.getByText('reviewForm.subScores.accuracy')).toBeTruthy();
    });

    it('submits the chosen sub-scores alongside the overall rating, omitting unset ones', async () => {
        const user = userEvent.setup();
        renderForm();

        const radios = screen.getAllByRole('radio', { name: 'reviewForm.ratingOption' });
        // DOM order: overall(5) organisation(5) guide(5) value(5) accuracy(5)
        await user.click(radios[4]); // overall = 5
        await user.click(radios[5 + 3]); // organisation = 4
        await user.click(radios[10 + 4]); // guide = 5

        await user.click(screen.getByRole('button', { name: 'reviewForm.submit' }));

        await waitFor(() => expect(mockPost).toHaveBeenCalled());
        const reviewCall = mockPost.mock.calls.find((c) => String(c[0]).includes('/review'));
        expect(reviewCall).toBeTruthy();
        expect(reviewCall[1]).toMatchObject({
            rating: 5,
            organisationRating: 4,
            guideRating: 5,
        });
        expect(reviewCall[1]).not.toHaveProperty('valueRating');
        expect(reviewCall[1]).not.toHaveProperty('accuracyRating');
        expect(reviewCall[1]).not.toHaveProperty('photoKeys');
    });

    it('uploads photos through the private review-photo intent and attaches the returned keys', async () => {
        const user = userEvent.setup();
        mockPost.mockImplementation(async (url: string) => {
            if (url === '/upload') {
                return { data: { filename: 'private/traveler-1/review-photos/uuid-1.jpg', url: '' } };
            }
            return { data: {} };
        });
        renderForm();

        const radios = screen.getAllByRole('radio', { name: 'reviewForm.ratingOption' });
        await user.click(radios[4]); // overall = 5

        const file = new File(['jpeg-bytes'], 'atlas.jpg', { type: 'image/jpeg' });
        await user.upload(screen.getByLabelText('reviewForm.photosLabel'), file);
        expect(screen.getByText('atlas.jpg')).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'reviewForm.submit' }));

        await waitFor(() =>
            expect(
                mockPost.mock.calls.some((c) => String(c[0]).includes('/review')),
            ).toBe(true),
        );
        const uploadCall = mockPost.mock.calls.find((c) => c[0] === '/upload');
        expect(uploadCall).toBeTruthy();
        const formData = uploadCall[1] as FormData;
        expect(formData.get('intent')).toBe('review-photo');
        const reviewCall = mockPost.mock.calls.find((c) => String(c[0]).includes('/review'));
        expect(reviewCall[1]).toMatchObject({
            rating: 5,
            photoKeys: ['private/traveler-1/review-photos/uuid-1.jpg'],
        });
    });
});
