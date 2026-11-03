/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('ReviewForm (#503)', () => {
    beforeEach(() => mockPost.mockReset());

    it('has a keyboard-operable radiogroup and an associated comment label', async () => {
        const user = userEvent.setup();
        renderForm();

        const [first, second] = screen.getAllByRole('radio', { name: 'reviewForm.ratingOption' });
        expect(second).toBeTruthy();
        expect(first.getAttribute('aria-checked')).toBe('false');
        await user.click(first);
        expect(first.getAttribute('aria-checked')).toBe('true');
        await user.keyboard('{ArrowRight}');
        expect(second.getAttribute('aria-checked')).toBe('true');
        expect(screen.getByLabelText('reviewForm.commentLabel')).toBeTruthy();
    });

    it('announces a localised validation error instead of submitting without a rating', async () => {
        const user = userEvent.setup();
        renderForm();

        await user.click(screen.getByRole('button', { name: 'reviewForm.submit' }));
        expect(screen.getByRole('alert').textContent).toContain('reviewForm.ratingRequired');
        expect(mockPost).not.toHaveBeenCalled();
    });
});
