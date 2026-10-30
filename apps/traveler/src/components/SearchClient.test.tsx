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
  MobileFilterDrawer: ({ children }: any) => <div>{children}</div>,
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
  ratingMin: 4,
};

function lastQueryParams() {
  const calls = mockUseTripsQuery.mock.calls;
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
  mockUseTripsQuery.mockReturnValue({
    data: { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } },
    isLoading: false,
    error: null,
    isError: false,
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

  it('debounces the text echo by 300ms and writes q via replace, preserving other filters', () => {
    jest.useFakeTimers();
    try {
      render(<SearchClient initialFilters={initialFilters} initialResponse={null} />);
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
});
