/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminDashboard from './page';
import { apiClient } from '@/lib/api-client';

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

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(() => new Promise(() => {})),
  },
}));

const getMock = apiClient.get as jest.Mock;

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminDashboard />
    </QueryClientProvider>,
  );
}

/**
 * #469: on a cold load (no cached rows yet) a dashboard tab shows the
 * skeleton instead of flashing its empty state; once data arrives the
 * real tab (here: its empty state) replaces it.
 */
describe('AdminDashboard loading state (#469)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the tab skeleton while the first list request is in flight', () => {
    // Every list request stays in flight for the whole test.
    getMock.mockImplementation(() => new Promise(() => {}));
    const { container } = renderDashboard();

    const status = screen.getByRole('status', { name: 'loading.label' });
    expect(status).not.toBeNull();
    expect(status.getAttribute('aria-label')).toBe('loading.label');
    // Five skeleton card rows stand in for the pending agencies/trips.
    const skeletonRoot = status.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(skeletonRoot).not.toBeNull();
    expect(skeletonRoot.childElementCount).toBe(5);
    // The real tab (its section headers) is not rendered yet.
    expect(container.textContent).not.toContain('dashboard.sections.pendingAgencies');
  });

  it('swaps the skeleton for the real tab once lists resolve', async () => {
    getMock.mockImplementation((url: string) =>
      String(url).includes('counts')
        ? Promise.resolve({ data: {} })
        : Promise.resolve({ data: [] }),
    );
    renderDashboard();

    // The real pending tab renders (section header with a 0 count);
    // no skeleton remains.
    await screen.findByText(/dashboard\.sections\.pendingAgencies/);
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'loading.label' })).toBeNull();
    });
  });
});
