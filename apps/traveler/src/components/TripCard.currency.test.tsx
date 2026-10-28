/**
 * @jest-environment jsdom
 *
 * #498 rework: TripCard renders its price in the traveller's display
 * currency (converted through the MAD-base rates), and in the trip's
 * authoritative currency when display == trip currency (MAD case) or
 * when no rate exists. Checkout is untouched — this is render-only.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TripCard, type TripCardTrip } from './TripCard';
import { DisplayCurrencyProvider } from '@/lib/display-currency';

let mockUser: any = null;
let mockRates: Record<string, number> = {};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === 'tripCard.days') return `${options?.count} Days`;
      if (key === 'tripCard.spots') return `${options?.count} spots`;
      return key;
    },
    i18n: { language: 'en', dir: () => 'ltr' },
  }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@ouiboo/ui', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Button: ({ children }: any) => <button type="button">{children}</button>,
  // eslint-disable-next-line @next/next/no-img-element
  SafeImage: (props: any) => <img {...props} alt={props.alt} />,
}));

jest.mock('@ouiboo/ui/utils', () => ({
  cn: (...parts: unknown[]) => parts.filter(Boolean).join(' '),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ prefetchQuery: jest.fn() }),
  useQuery: (options: any) => {
    const key = options.queryKey as unknown[];
    if (key[0] === 'currency' && key[1] === 'rate') {
      const rate = mockRates[key[2] as string];
      return { data: rate };
    }
    if (key[0] === 'currency' && key[1] === 'supported') {
      return { data: ['MAD', 'USD', 'EUR'] };
    }
    return { data: undefined };
  },
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: { get: jest.fn(), patch: jest.fn() },
}));

jest.mock('@/components/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, refetch: jest.fn() }),
}));

jest.mock('./WishlistButton', () => ({
  WishlistButton: () => null,
}));

jest.mock('next/link', () => {
  const Link = ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  return Link;
});

const trip: TripCardTrip = {
  id: 'trip-1',
  title: 'Atlas Trek',
  currency: 'MAD',
  startLocation: 'Imlil',
  durationDays: 3,
  images: ['https://cdn.example.com/a.jpg'],
  sessions: [
    {
      id: 's1',
      status: 'OPEN',
      availableSeats: 5,
      price: 1000,
      currency: 'MAD',
      startDate: '2027-01-10T00:00:00.000Z',
    },
  ],
};

beforeEach(() => {
  mockUser = null;
  mockRates = {};
});

describe('TripCard display currency (#498)', () => {
  it('renders the MAD price natively when the display currency is MAD', () => {
    render(
      <DisplayCurrencyProvider>
        <TripCard trip={trip} />
      </DisplayCurrencyProvider>,
    );
    expect(screen.getByText(/MAD\s*1,000/)).not.toBeNull();
  });

  it('converts the MAD price into a non-MAD display currency via the cached rate', () => {
    mockUser = { id: 'u1', name: 'Sara', email: 's@x.io', role: 'TRAVELER', displayCurrency: 'EUR' };
    mockRates = { EUR: 0.092 };
    render(
      <DisplayCurrencyProvider>
        <TripCard trip={trip} />
      </DisplayCurrencyProvider>,
    );
    // 1000 MAD x 0.092 = EUR 92.
    expect(screen.getByText(/€\s*92/)).not.toBeNull();
    expect(screen.queryByText(/1,000/)).toBeNull();
  });

  it('falls back to the authoritative MAD price when no rate exists', () => {
    mockUser = { id: 'u1', name: 'Sara', email: 's@x.io', role: 'TRAVELER', displayCurrency: 'EUR' };
    mockRates = {}; // rate unavailable
    render(
      <DisplayCurrencyProvider>
        <TripCard trip={trip} />
      </DisplayCurrencyProvider>,
    );
    expect(screen.getByText(/MAD\s*1,000/)).not.toBeNull();
  });
});
