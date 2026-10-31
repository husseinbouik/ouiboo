/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import HomeClient from './HomeClient';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

// react-i18next is mocked in traveller jest tests: t() returns the
// key, so assertions target the featured.* keys the section renders.
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

jest.mock('next/dynamic', () => () => () => null);

jest.mock('framer-motion', () => {
    const MOTION_ONLY_PROPS = ['variants', 'initial', 'animate', 'whileInView', 'viewport', 'transition', 'whileHover'];
    const make = (tag: string) => {
        const Component = ({ children, ...props }: any) => {
            const domProps: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(props)) {
                if (!MOTION_ONLY_PROPS.includes(key)) domProps[key] = value;
            }
            return React.createElement(tag, domProps, children);
        };
        return Component;
    };
    return {
        motion: { div: make('div'), h1: make('h1'), p: make('p') },
    };
});

describe('HomeClient hero search (#723)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // In the mocked i18n, t() returns the key: the destination input is
    // labelled 'hero.where', the date inputs 'search.startDate' /
    // 'search.endDate', and the destination suggestions render the
    // 'search.destinationNames.<slug>' keys — resolution still works
    // because buildHeroSearchParams receives those same strings as the
    // localised names.
    function fillHero(destination?: string, dateFrom?: string, dateTo?: string) {
        if (destination !== undefined) {
            fireEvent.change(screen.getByLabelText('hero.where'), { target: { value: destination } });
        }
        if (dateFrom !== undefined) {
            fireEvent.change(screen.getByLabelText('search.startDate'), { target: { value: dateFrom } });
        }
        if (dateTo !== undefined) {
            fireEvent.change(screen.getByLabelText('search.endDate'), { target: { value: dateTo } });
        }
    }

    it('submits a known destination as the destination facet with canonical date params', () => {
        render(<HomeClient featuredTrips={[]} />);
        fillHero('search.destinationNames.chefchaouen', '2026-11-10', '2026-11-12');

        fireEvent.click(screen.getByRole('button', { name: 'hero.search' }));

        expect(mockPush).toHaveBeenCalledTimes(1);
        const url = mockPush.mock.calls[0][0] as string;
        expect(url).toContain('destination=chefchaouen');
        expect(url).toContain('dateFrom=2026-11-10');
        expect(url).toContain('dateTo=2026-11-12');
        expect(url).not.toContain('q=');
    });

    it('submits via form submission (Enter) as well as the button', () => {
        const { container } = render(<HomeClient featuredTrips={[]} />);
        fillHero('atlas');

        const form = container.querySelector('form');
        expect(form).not.toBeNull();
        fireEvent.submit(form as HTMLFormElement);

        expect(mockPush).toHaveBeenCalledWith('/search?q=atlas');
    });

    it('falls back to q for free text that is not a configured destination', () => {
        render(<HomeClient featuredTrips={[]} />);
        fillHero('atlas');

        fireEvent.click(screen.getByRole('button', { name: 'hero.search' }));

        expect(mockPush).toHaveBeenCalledWith('/search?q=atlas');
    });

    it('navigates to the unfiltered search page when submitted empty', () => {
        render(<HomeClient featuredTrips={[]} />);

        fireEvent.click(screen.getByRole('button', { name: 'hero.search' }));

        expect(mockPush).toHaveBeenCalledWith('/search');
    });

    it('blocks an inverted date range with an accessible validation message', () => {
        render(<HomeClient featuredTrips={[]} />);
        fillHero('', '2026-11-12', '2026-11-10');

        fireEvent.click(screen.getByRole('button', { name: 'hero.search' }));

        expect(mockPush).not.toHaveBeenCalled();
        const alert = screen.getByRole('alert');
        expect(alert.textContent).toBe('hero.dateRangeError');
        expect(screen.getByLabelText('search.startDate').getAttribute('aria-describedby')).toBe('hero-date-error');
    });
});

describe('HomeClient featured trips (#575)', () => {
    it('renders the error state — not the empty state — when the catalogue fetch failed', () => {
        render(<HomeClient featuredTrips={[]} featuredTripsFetchFailed />);

        expect(screen.getByText('featured.loadErrorTitle')).not.toBeNull();
        expect(screen.getByText('featured.loadErrorSubtitle')).not.toBeNull();
        expect(screen.getByText('common.tryAgain')).not.toBeNull();
        expect(screen.queryByText('featured.emptyTitle')).toBeNull();
        expect(screen.queryByText('featured.emptySubtitle')).toBeNull();
    });

    it('renders the genuine empty state when the fetch succeeded with no trips', () => {
        render(<HomeClient featuredTrips={[]} featuredTripsFetchFailed={false} />);

        expect(screen.getByText('featured.emptyTitle')).not.toBeNull();
        expect(screen.getByText('featured.emptySubtitle')).not.toBeNull();
        expect(screen.queryByText('featured.loadErrorTitle')).toBeNull();
    });

    it('defaults to the empty state when no fetch-failure flag is passed', () => {
        render(<HomeClient featuredTrips={[]} />);

        expect(screen.getByText('featured.emptyTitle')).not.toBeNull();
        expect(screen.queryByText('featured.loadErrorTitle')).toBeNull();
    });
});
