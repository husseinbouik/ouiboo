/**
 * @jest-environment jsdom
 *
 * #440 rework: SearchClient treats the URL as the single source of
 * truth for filters. These tests lock the NEW freshness behaviour:
 * every control serializes ALL filter params via router.replace, the
 * rendered query always follows the current URL (back/forward without
 * a reload), and router.push is never used from a state updater.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SearchClient, { type SearchInitialFilters } from './SearchClient';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockUseTripsQuery = jest.fn();

let currentParams = new URLSearchParams(
  'q=atlas&category=adventure&priceMin=100&priceMax=900&dateFrom=2026-11-01&dateTo=2026-11-20&available=true&ratingMin=4',
);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useSearchParams: () => currentParams,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: unknown) => (typeof options === 'string' ? options : key),
    ready: true,
    i18n: { language: 'en' },
  }),
}));

jest.mock('@ouiboo/api-client', () => ({
  useTripsQuery: (...args: unknown[]) => mockUseTripsQuery(...args),
}));

jest.mock('@ouiboo/ui', () => ({
  Button: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  Input: (props: any) => <input {...props} />,
  Badge: ({ children }: any) => <span>{children}</span>,
  MobileFilterDrawer: ({ children, footer }: any) => (
    <div>
      {children}
      {footer}
    </div>
  ),
  TripCardSkeletonGrid: () => null,
}));

jest.mock('@ouiboo/ui/utils', () => ({
  cn: (...parts: unknown[]) => parts.filter(Boolean).join(' '),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/TripCard', () => ({
  TripCard: () => null,
}));

const initialFilters: SearchInitialFilters = {
  category: 'ADVENTURE',
  destination: '',
  duration: '',
  priceMax: '900',
  searchQuery: 'atlas',
  dateFrom: '2026-11-01',
  dateTo: '2026-11-20',
  priceMin: '100',
  availabilityOnly: true,
  freeCancellationOnly: false,
  ratingMin: 4,
};

function lastQueryParams() {
  // Three useTripsQuery consumers exist now: the main search query
  // (limit 9 — the fidelity pass's 9-per-page grid), the #877
  // zero-state featured query (limit 3), and the council item-2
  // catalogue counts query (limit 50). The main query is the
  // limit-9 one.
  const calls = mockUseTripsQuery.mock.calls.filter(
    (call) => (call[0] as { limit?: number })?.limit === 9,
  );
  return calls[calls.length - 1][0];
}

function lastReplaceUrl(): string {
  const calls = mockReplace.mock.calls;
  return calls[calls.length - 1][0] as string;
}

beforeEach(() => {
  jest.clearAllMocks();
  currentParams = new URLSearchParams(
    'q=atlas&category=adventure&priceMin=100&priceMax=900&dateFrom=2026-11-01&dateTo=2026-11-20&available=true&ratingMin=4',
  );
  mockUseTripsQuery.mockImplementation((params: { limit?: number }) => {
    // Council item 2: the catalogue counts query (limit 50) sees a
    // small catalogue — Tangier ×2, Chefchaouen ×1, Tétouan zero.
    if (params?.limit === 50) {
      return {
        data: {
          data: [
            { id: 'c1', destinationSlug: 'tangier' },
            { id: 'c2', destinationSlug: 'tangier' },
            { id: 'c3', destinationSlug: 'chefchaouen' },
          ],
          pagination: { total: 3, page: 1, limit: 50, totalPages: 1 },
        },
        isLoading: false,
        error: null,
        isError: false,
      };
    }
    return {
      data: { data: [], pagination: { total: 0, page: 1, limit: 9, totalPages: 0 } },
      isLoading: false,
      error: null,
      isError: false,
    };
  });
});

describe('SearchClient URL-as-source-of-truth (#440)', () => {
  it('parses ALL filters from the URL on first render — dates, availability and rating included', () => {
    render(<SearchClient initialFilters={initialFilters} initialResponse={null} />);
    const params = lastQueryParams();
    expect(params.q).toBe('atlas');
    expect(params.category).toBe('ADVENTURE');
    expect(params.priceMin).toBe(100);
    expect(params.priceMax).toBe(900);
    expect(params.startDateFrom).toBe('2026-11-01');
    expect(params.startDateTo).toBe('2026-11-20');
    expect(params.available).toBe(true);
    expect(params.ratingMin).toBe(4);
  });

  it('toggling availability writes the COMPLETE filter set via router.replace (nothing dropped)', () => {
    render(<SearchClient initialFilters={initialFilters} initialResponse={null} />);
    fireEvent.click(screen.getAllByText('search.availabilityOnly')[0]);

    expect(mockPush).not.toHaveBeenCalled();
    const url = lastReplaceUrl();
    expect(url.startsWith('/search?')).toBe(true);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('available')).toBeNull(); // toggled off
    expect(params.get('q')).toBe('atlas');
    expect(params.get('category')).toBe('ADVENTURE');
    expect(params.get('priceMin')).toBe('100');
    expect(params.get('priceMax')).toBe('900');
    expect(params.get('dateFrom')).toBe('2026-11-01');
    expect(params.get('dateTo')).toBe('2026-11-20');
    expect(params.get('ratingMin')).toBe('4');
  });

  it('changing a date keeps q/availability/rating in the URL', () => {
    render(<SearchClient initialFilters={initialFilters} initialResponse={null} />);
    fireEvent.change(screen.getAllByLabelText('search.startDate')[0], {
      target: { value: '2026-12-05' },
    });
    const params = new URLSearchParams(lastReplaceUrl().split('?')[1]);
    expect(params.get('dateFrom')).toBe('2026-12-05');
    expect(params.get('dateTo')).toBe('2026-11-20');
    expect(params.get('available')).toBe('true');
    expect(params.get('ratingMin')).toBe('4');
    expect(params.get('q')).toBe('atlas');
  });

  it('follows URL changes without a reload (back/forward freshness)', () => {
    const { rerender } = render(
      <SearchClient initialFilters={initialFilters} initialResponse={null} />,
    );
    expect(lastQueryParams().q).toBe('atlas');

    // Simulate back/forward (or a fresh deep link) landing on new params.
    currentParams = new URLSearchParams('q=desert');
    rerender(<SearchClient initialFilters={initialFilters} initialResponse={null} />);

    const params = lastQueryParams();
    expect(params.q).toBe('desert');
    expect(params.startDateFrom).toBeUndefined();
    expect(params.available).toBeUndefined();
    expect(params.ratingMin).toBeUndefined();
  });

  it('parses destination + duration facets from the URL and sends them to the API (#675)', () => {
    currentParams = new URLSearchParams('destination=tetouan&duration=4-7');
    render(<SearchClient initialFilters={{ ...initialFilters, destination: 'tetouan', duration: '4-7' }} initialResponse={null} />);
    const params = lastQueryParams();
    expect(params.destination).toBe('tetouan');
    expect(params.durationMin).toBe(4);
    expect(params.durationMax).toBe(7);
  });

  it('ignores an unknown destination slug and an unknown duration bucket (#675)', () => {
    currentParams = new URLSearchParams('destination=fes&duration=forever');
    render(<SearchClient initialFilters={initialFilters} initialResponse={null} />);
    const params = lastQueryParams();
    expect(params.destination).toBeUndefined();
    expect(params.durationMin).toBeUndefined();
    expect(params.durationMax).toBeUndefined();
  });

  it('clicking a destination facet writes destination + duration into the URL, keeping the rest (#675)', () => {
    render(<SearchClient initialFilters={initialFilters} initialResponse={null} />);
    fireEvent.click(screen.getAllByText('search.destinationNames.chefchaouen')[0]);
    const afterDestination = new URLSearchParams(lastReplaceUrl().split('?')[1]);
    expect(afterDestination.get('destination')).toBe('chefchaouen');
    expect(afterDestination.get('q')).toBe('atlas');

    fireEvent.click(screen.getAllByText('search.durationBuckets.2-3')[0]);
    const afterDuration = new URLSearchParams(lastReplaceUrl().split('?')[1]);
    expect(afterDuration.get('duration')).toBe('2-3');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('isolates duration ranges so they do not reverse in an RTL document (#746)', () => {
    render(<SearchClient initialFilters={initialFilters} initialResponse={null} />);
    const duration = screen.getAllByText('search.durationBuckets.2-3')[0];
    expect(duration.tagName).toBe('BDI');
    expect(duration.getAttribute('dir')).toBe('ltr');
  });

  it('debounces the text echo by 300ms and writes q via replace, preserving other filters', () => {
    jest.useFakeTimers();
    try {
      render(<SearchClient initialFilters={initialFilters} initialResponse={null} />);
      // #877: the dated fixture resolves empty, so the dated
      // auto-strip legitimately fires router.replace on mount —
      // clear it; this test measures the debounce write only.
      mockReplace.mockClear();
      fireEvent.change(screen.getByLabelText('search.placeholder'), {
        target: { value: 'oasis' },
      });
      expect(mockReplace).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(300);
      });
      const params = new URLSearchParams(lastReplaceUrl().split('?')[1]);
      expect(params.get('q')).toBe('oasis');
      expect(params.get('dateFrom')).toBe('2026-11-01');
      expect(params.get('available')).toBe('true');
      expect(params.get('ratingMin')).toBe('4');
      expect(mockPush).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('serializes the direction-named sort select into the URL, keeping every filter (council item 5)', () => {
    render(<SearchClient initialFilters={initialFilters} initialResponse={null} />);
    fireEvent.change(screen.getByLabelText('search.sort'), {
      target: { value: 'price-asc' },
    });
    const params = new URLSearchParams(lastReplaceUrl().split('?')[1]);
    expect(params.get('sort')).toBe('price-asc');
    expect(params.get('q')).toBe('atlas');
    expect(params.get('category')).toBe('ADVENTURE');
    expect(params.get('ratingMin')).toBe('4');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('restores sort from the URL into the API query (shared-link parity)', () => {
    currentParams = new URLSearchParams('sort=price-desc');
    render(<SearchClient initialFilters={initialFilters} initialResponse={null} initialSort="price-desc" />);
    const params = lastQueryParams();
    expect(params.sortBy).toBe('price');
    expect(params.sortOrder).toBe('desc');
  });

  it('keeps the sort key when a filter changes (one URL contract)', () => {
    currentParams = new URLSearchParams('sort=price-asc');
    render(<SearchClient initialFilters={initialFilters} initialResponse={null} initialSort="price-asc" />);
    fireEvent.click(screen.getAllByText('search.availabilityOnly')[0]);
    const params = new URLSearchParams(lastReplaceUrl().split('?')[1]);
    expect(params.get('sort')).toBe('price-asc');
    expect(params.get('available')).toBe('true');
  });

  it('discloses Tétouan as plain text under its own heading — never a control (K6c)', () => {
    render(<SearchClient initialFilters={initialFilters} initialResponse={null} />);
    expect(screen.getAllByText('search.noTripsYetPlaces').length).toBeGreaterThan(0);
    expect(screen.getAllByText('search.destinationNoTripsYet').length).toBeGreaterThan(0);
    // The Tétouan NAME only ever appears inside the disclosed line —
    // never as a radio/button label.
    expect(screen.queryByText('search.destinationNames.tetouan')).toBeNull();
    // Places with trips stay selectable radios with counts.
    expect(screen.getAllByText('search.destinationNames.tangier').length).toBeGreaterThan(0);
    expect(screen.getAllByText('search.facetCount').length).toBeGreaterThan(0);
  });

  it('renders the results-head state line as the single role=status region (item 4)', () => {
    render(<SearchClient initialFilters={initialFilters} initialResponse={null} />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('search.stateTrips');
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('labels the cancellation filter neutrally — bare "Free cancellation" never ships (item 9)', () => {
    render(<SearchClient initialFilters={initialFilters} initialResponse={null} />);
    expect(screen.getAllByText('search.cancellationTerms').length).toBeGreaterThan(0);
    expect(screen.queryByText('search.freeCancellation')).toBeNull();
  });

  it('commits price inputs on a 300ms debounce, not per keystroke (item 7)', () => {
    jest.useFakeTimers();
    try {
      render(<SearchClient initialFilters={initialFilters} initialResponse={null} />);
      mockReplace.mockClear();
      fireEvent.change(screen.getAllByLabelText('search.minPrice')[0], {
        target: { value: '250' },
      });
      expect(mockReplace).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(300);
      });
      const params = new URLSearchParams(lastReplaceUrl().split('?')[1]);
      expect(params.get('priceMin')).toBe('250');
      expect(params.get('priceMax')).toBe('900');
      expect(mockPush).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('the mobile drawer footer reports the applied total (item 3)', () => {
    render(<SearchClient initialFilters={initialFilters} initialResponse={null} />);
    expect(screen.getByText('search.drawerDone')).toBeTruthy();
  });

  it('hide filters collapses the desktop rail and expands the grid to 4 columns; show filters restores both (Card A, 2026-11-13)', () => {
    const { container } = render(<SearchClient initialFilters={initialFilters} initialResponse={null} />);
    const rail = container.querySelector('aside');
    expect(rail).not.toBeNull();
    // The rail card scrolls independently: sticky, viewport-capped, overflow-y auto.
    const railCard = rail?.firstElementChild as HTMLElement | null;
    expect(railCard?.className).toContain('overflow-y-auto');
    expect(railCard?.className).toContain('max-h-[calc(100vh-8rem)]');
    const resultsGrid = () =>
      Array.from(container.querySelectorAll('section .grid')).find((el) =>
        el.className.includes('sm:grid-cols-2'),
      );
    expect(resultsGrid()?.className).toContain('lg:grid-cols-3');

    fireEvent.click(screen.getByText('search.hideFilters'));
    expect(container.querySelector('aside')).toBeNull();
    expect(resultsGrid()?.className).toContain('lg:grid-cols-4');

    fireEvent.click(screen.getByText('search.showFilters'));
    expect(container.querySelector('aside')).not.toBeNull();
    expect(resultsGrid()?.className).toContain('lg:grid-cols-3');
  });
});
