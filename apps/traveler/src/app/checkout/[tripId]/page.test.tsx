import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CheckoutPage from './page';

jest.mock('next/navigation', () => ({
  useParams: () => ({ tripId: 'trip-1' }),
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/components/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

jest.mock('@/components/checkout/useCheckoutBooking', () => ({
  useCheckoutBooking: () => ({
    createBookingMutation: { mutate: jest.fn(), isPending: false },
    errorMessage: null,
  }),
}));

// The trip request stays in flight: checkout is in its loading state.
jest.mock('@/lib/api-client', () => ({
  apiClient: { get: jest.fn(() => new Promise(() => {})) },
}));

/**
 * #469: while the trip loads, checkout shows the layout-matched
 * CheckoutSkeleton (announced via role="status") instead of bare text.
 */
describe('CheckoutPage loading state (#469)', () => {
  it('renders the checkout skeleton while the trip is loading', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={client}>
        <CheckoutPage />
      </QueryClientProvider>,
    );

    const status = screen.getByRole('status');
    expect(status).not.toBeNull();
    // The skeleton keeps the loaded page's 12-column split.
    expect(container.querySelector('.lg\\:col-span-8')).not.toBeNull();
    expect(container.querySelector('.lg\\:col-span-4')).not.toBeNull();
  });
});
