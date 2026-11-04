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

describe('ReviewForm video review (#783)', () => {
    beforeEach(() => {
        mockPost.mockReset();
        mockPost.mockResolvedValue({ data: {} });
    });

    it('renders the optional video picker alongside the photo picker', () => {
        renderForm();
        expect(screen.getByLabelText('reviewForm.videoLabel')).toBeTruthy();
        expect(screen.getByLabelText('reviewForm.photosLabel')).toBeTruthy();
    });

    it('uploads the video through the private review-video intent and attaches the returned key', async () => {
        const user = userEvent.setup();
        mockPost.mockImplementation(async (url: string) => {
            if (url === '/upload') {
                return {
                    data: {
                        filename: 'private/traveler-1/review-videos/uuid-9.mp4',
                        // Private uploads are never public at upload.
                        url: '',
                    },
                };
            }
            return { data: {} };
        });
        renderForm();

        const radios = screen.getAllByRole('radio', { name: 'reviewForm.ratingOption' });
        await user.click(radios[4]); // overall = 5

        const file = new File(['mp4-bytes'], 'desert.mp4', { type: 'video/mp4' });
        await user.upload(screen.getByLabelText('reviewForm.videoLabel'), file);
        expect(screen.getByText('desert.mp4')).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'reviewForm.submit' }));

        await waitFor(() =>
            expect(
                mockPost.mock.calls.some((c) => String(c[0]).includes('/review')),
            ).toBe(true),
        );
        const uploadCall = mockPost.mock.calls.find((c) => c[0] === '/upload');
        expect(uploadCall).toBeTruthy();
        const formData = uploadCall[1] as FormData;
        expect(formData.get('intent')).toBe('review-video');
        const reviewCall = mockPost.mock.calls.find((c) => String(c[0]).includes('/review'));
        expect(reviewCall[1]).toMatchObject({
            rating: 5,
            videoKey: 'private/traveler-1/review-videos/uuid-9.mp4',
        });
        expect(reviewCall[1]).not.toHaveProperty('photoKeys');
    });

    it('omits videoKey entirely when no video is chosen', async () => {
        const user = userEvent.setup();
        renderForm();

        const radios = screen.getAllByRole('radio', { name: 'reviewForm.ratingOption' });
        await user.click(radios[4]); // overall = 5

        await user.click(screen.getByRole('button', { name: 'reviewForm.submit' }));

        await waitFor(() => expect(mockPost).toHaveBeenCalled());
        const reviewCall = mockPost.mock.calls.find((c) => String(c[0]).includes('/review'));
        expect(reviewCall).toBeTruthy();
        expect(reviewCall[1]).not.toHaveProperty('videoKey');
        // No upload happened at all.
        expect(mockPost.mock.calls.some((c) => c[0] === '/upload')).toBe(false);
    });

    it('lets the traveller remove a chosen video before submitting', async () => {
        const user = userEvent.setup();
        renderForm();

        const file = new File(['mp4-bytes'], 'kasbah.mp4', { type: 'video/mp4' });
        await user.upload(screen.getByLabelText('reviewForm.videoLabel'), file);
        expect(screen.getByText('kasbah.mp4')).toBeTruthy();

        await user.click(
            screen.getByRole('button', { name: 'reviewForm.videoRemove' }),
        );
        expect(screen.queryByText('kasbah.mp4')).toBeNull();
    });
});
