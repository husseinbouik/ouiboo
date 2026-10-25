/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminDashboard from './page';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock('@/components/AuthContext', () => ({
  useAuth: () => ({ logout: jest.fn() }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      typeof opts?.defaultValue === 'string' ? (opts.defaultValue as string) : key,
    i18n: { language: 'en', changeLanguage: jest.fn(), dir: () => 'ltr' },
  }),
}));

// Every list request stays in flight: the dashboard is in its cold-load
// state for the whole test.
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(() => new Promise(() => {})),
    post: jest.fn(() => new Promise(() => {})),
  },
}));

/**
 * #469: on a cold load (no cached rows yet) a dashboard tab shows the
 * skeleton instead of flashing its empty state.
 */
describe('AdminDashboard loading state (#469)', () => {
  it('shows the tab skeleton while the first list request is in flight', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={client}>
        <AdminDashboard />
      </QueryClientProvider>,
    );

    const status = screen.getByRole('status', { name: 'loading.label' });
    expect(status).not.toBeNull();
    expect(status.getAttribute('aria-label')).toBe('loading.label');
    // Five skeleton card rows stand in for the pending agencies/trips.
    const skeletonRoot = status.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(skeletonRoot).not.toBeNull();
    expect(skeletonRoot.childElementCount).toBe(5);
    expect(container.textContent).not.toContain('dashboard.pending.empty');
  });
});
