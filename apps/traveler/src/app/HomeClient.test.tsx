/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
        if (dateFrom !== undefined || dateTo !== undefined) {
            // #877: dates live behind the "Add dates" toggle — open it first.
            fireEvent.click(screen.getByRole('button', { name: 'hero.addDates' }));
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
        // #877: dates must be in the future — past dates are rejected
        // inline by design, so this #723-era fixture uses 2027 dates.
        fillHero('search.destinationNames.chefchaouen', '2027-11-10', '2027-11-12');

        fireEvent.click(screen.getByRole('button', { name: 'hero.search' }));

        expect(mockPush).toHaveBeenCalledTimes(1);
        const url = mockPush.mock.calls[0][0] as string;
        expect(url).toContain('destination=chefchaouen');
        expect(url).toContain('dateFrom=2027-11-10');
        expect(url).toContain('dateTo=2027-11-12');
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
        // Future dates, so the range check — not the #877 past-date
        // check, which runs first — is what fires.
        fillHero('', '2027-11-12', '2027-11-10');

        fireEvent.click(screen.getByRole('button', { name: 'hero.search' }));

        expect(mockPush).not.toHaveBeenCalled();
        const alert = screen.getByRole('alert');
        expect(alert.textContent).toBe('hero.dateRangeError');
        expect(screen.getByLabelText('search.startDate').getAttribute('aria-describedby')).toBe('hero-date-error');
    });

    it('blocks past dates with the past-date validation message (#877)', () => {
        render(<HomeClient featuredTrips={[]} />);
        fillHero('', '2020-01-10', '2020-01-12');

        fireEvent.click(screen.getByRole('button', { name: 'hero.search' }));

        expect(mockPush).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toBe('hero.pastDateError');
    });
});

describe('HomeClient static imagery + trust strip (founder amendments 2026-11-11, #880/#887/#898/#917)', () => {
    it('renders the fixed signature hero photo — a place, not a trip link', () => {
        const { container } = render(<HomeClient featuredTrips={[]} />);
        const heroImg = container.querySelector('img[alt="hero.photoAlt"]');
        expect(heroImg).not.toBeNull();
        expect(heroImg?.getAttribute('src')).toContain('hero-atlas-night');
        expect(screen.getByText('hero.photoCaption')).not.toBeNull();
        // The hero is a photograph of a place: it must not navigate
        // to a trip and must not carry a trip title.
        expect(heroImg?.closest('a')).toBeNull();
    });

    it('renders the #887 trust strip claims under the hero search', () => {
        render(<HomeClient featuredTrips={[]} />);
        expect(screen.getByText('trustStrip.licence')).not.toBeNull();
        expect(screen.getByText('trustStrip.payDirect')).not.toBeNull();
        expect(screen.getByText('trustStrip.cancellation')).not.toBeNull();
    });

    it('destination tiles use the fixed curated asset, never a trip photo (#898)', () => {
        const trip: any = {
            id: 'chef-1',
            title: 'Blue City',
            destinationSlug: 'chefchaouen',
            startLocation: 'Chefchaouen',
            images: ['https://example.com/trip-photo.jpg'],
            sessions: [],
            agency: { id: 'agency-1' },
        };
        // The coverage tiles this catalogue renders use react-query
        // (display-currency) — provide a client like the app does.
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(
            <QueryClientProvider client={queryClient}>
                <HomeClient catalogTrips={[trip]} />
            </QueryClientProvider>,
        );
        const section = screen.getByText('featured.betaRegion.title').closest('section');
        expect(section).not.toBeNull();
        const tileSrcs = [...(section?.querySelectorAll('img') ?? [])].map((img) => img.getAttribute('src') ?? '');
        expect(tileSrcs.some((src) => src.includes('chefchaouen'))).toBe(true);
        expect(tileSrcs.some((src) => src.includes('trip-photo'))).toBe(false);
    });
});

describe('HomeClient coverage showcase + category tiles (round 2, founder 2026-11-11)', () => {
    function wrap(ui: React.ReactNode) {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        return <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>;
    }

    function catalogTrip(partial: Record<string, unknown>) {
        return {
            title: 'Trip',
            images: [],
            sessions: [],
            agency: { id: 'agency-1' },
            ...partial,
        } as any;
    }

    it('replaces the All-trips listing with the have / don\'t-have coverage showcase', () => {
        const trips = [
            catalogTrip({ id: 'merz-1', title: 'Merzouga Camel Trek', startLocation: 'Merzouga', destinationSlug: null, images: ['https://images.unsplash.com/photo-aaaa1111?q=80&w=1200'] }),
            catalogTrip({ id: 'merz-2', title: 'Dunes Night', startLocation: 'Merzouga, Morocco', destinationSlug: null, images: ['https://images.unsplash.com/photo-bbbb2222?q=80&w=1200'] }),
            catalogTrip({ id: 'tang-1', title: 'Tangier Day', startLocation: 'Tanger', destinationSlug: 'tangier' }),
        ];
        const { container } = render(wrap(<HomeClient catalogTrips={trips} />));
        expect(screen.getByText('featured.coverage.title')).not.toBeNull();
        expect(screen.queryByText('featured.allTrips.title')).toBeNull();
        // The two Merzouga spellings group into a single tile that
        // links into search for the place.
        const tile = screen.getByRole('link', { name: /Merzouga/ });
        expect(tile.getAttribute('href')).toBe('/search?q=Merzouga');
        // Honestly-empty well-known places render as tiles too.
        expect(screen.getByText('featured.coverage.names.agadir')).not.toBeNull();
        expect(screen.getByText('featured.coverage.names.dakhla')).not.toBeNull();
        // The cluster destination is NOT repeated in the showcase
        // (Start in the North covers it, one section up).
        expect(container.querySelector('a[href="/search?q=Tanger"]')).toBeNull();
    });

    it('an "absent" place disappears from the showcase the moment a trip exists there', () => {
        const trips = [
            catalogTrip({ id: 'aga-1', title: 'Agadir Beach Break', startLocation: 'Agadir', destinationSlug: null }),
        ];
        render(wrap(<HomeClient catalogTrips={trips} />));
        expect(screen.queryByText('featured.coverage.names.agadir')).toBeNull();
        expect(screen.getByText('featured.coverage.names.dakhla')).not.toBeNull();
    });

    it('category tiles are photo tiles, with styles under 2 trips suppressed (#898/#903)', () => {
        const trips = [
            catalogTrip({ id: 'a1', category: 'ADVENTURE', startLocation: 'Imlil', destinationSlug: null }),
            catalogTrip({ id: 'a2', category: 'ADVENTURE', startLocation: 'Imlil', destinationSlug: null }),
            catalogTrip({ id: 'l1', category: 'LUXURY', startLocation: 'Merzouga', destinationSlug: null }),
        ];
        const { container } = render(wrap(<HomeClient catalogTrips={trips} />));
        // The chip rail and the tile share the category href; the
        // TILE is the one carrying the frozen category photograph.
        const adventureLinks = [...container.querySelectorAll('a[href="/search?category=ADVENTURE"]')];
        const photoTile = adventureLinks.find((a) => a.querySelector('img')?.getAttribute('src')?.includes('categories%2Fadventure'));
        expect(photoTile).toBeTruthy();
        // Luxury has one trip: no chip, no tile.
        expect(container.querySelector('a[href="/search?category=LUXURY"]')).toBeNull();
    });

    it('renders the Why-book trio under its H2 (proposal P1-21)', () => {
        render(<HomeClient featuredTrips={[]} />);
        expect(screen.getByText('trust.title')).not.toBeNull();
        expect(screen.getByText('trust.verifiedTitle')).not.toBeNull();
        expect(screen.getByText('trust.instantTitle')).not.toBeNull();
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
