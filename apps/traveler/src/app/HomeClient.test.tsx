/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import HomeClient from './HomeClient';

// react-i18next is mocked in traveller jest tests: t() returns the
// key, so assertions target the featured.* keys the section renders.
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
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
