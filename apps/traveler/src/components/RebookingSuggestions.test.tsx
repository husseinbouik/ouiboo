/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { RebookingSuggestions, type RebookingSuggestionItem } from './RebookingSuggestions';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) =>
            options && 'count' in options ? `${key}:${options.count}` : key,
        i18n: { language: 'en' },
    }),
}));

function makeSuggestion(overrides: Partial<RebookingSuggestionItem> = {}): RebookingSuggestionItem {
    return {
        tripId: 'trip-1',
        title: 'Atlas Trek',
        image: null,
        agencyId: 'agency-1',
        companyName: 'Atlas Adventures',
        previousBookingsWithAgency: 2,
        sessionId: 'session-1',
        startDate: '2026-11-14T00:00:00.000Z',
        endDate: '2026-11-16T00:00:00.000Z',
        price: '1500.00',
        currency: 'MAD',
        availableSeats: 8,
        ...overrides,
    };
}

describe('RebookingSuggestions (#444)', () => {
    it('renders nothing when there are no suggestions', () => {
        const { container } = render(<RebookingSuggestions suggestions={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders a known-agency suggestion with the relationship count and a trip link', () => {
        render(<RebookingSuggestions suggestions={[makeSuggestion()]} />);

        expect(screen.getByText('rebooking.title')).not.toBeNull();
        expect(screen.getByText('Atlas Trek')).not.toBeNull();
        expect(screen.getByText(/rebooking.tripsBooked:2/)).not.toBeNull();
        const link = screen.getByRole('link', { name: 'rebooking.viewTrip' });
        expect(link.getAttribute('href')).toBe('/trip/trip-1');
    });

    it('renders one card per suggestion', () => {
        render(
            <RebookingSuggestions
                suggestions={[
                    makeSuggestion(),
                    makeSuggestion({ sessionId: 'session-2', tripId: 'trip-2', title: 'Sahara Nights' }),
                ]}
            />,
        );
        expect(screen.getByText('Atlas Trek')).not.toBeNull();
        expect(screen.getByText('Sahara Nights')).not.toBeNull();
    });
});
