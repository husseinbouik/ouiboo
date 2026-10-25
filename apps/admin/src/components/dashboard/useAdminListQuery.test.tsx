/**
 * @jest-environment jsdom
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminListQuery } from './useAdminListQuery';
import { apiClient } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  apiClient: { get: jest.fn() },
}));

const mockedGet = apiClient.get as unknown as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

/**
 * #469: admin tabs show a skeleton on cold load instead of flashing their
 * empty state. The hook exposes isLoading (true only while there is no
 * cached/placeholder data) alongside the paginated list.
 */
describe('useAdminListQuery (#469)', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('reports isLoading while the first request is in flight', () => {
    mockedGet.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(
      () => useAdminListQuery('/admin/bookings', 'all-bookings', true, 'BOOKINGS', '', 1),
      { wrapper },
    );
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  it('clears isLoading and returns rows once data arrives', async () => {
    mockedGet.mockResolvedValue({
      data: { data: [{ id: 'b1' }], pagination: { total: 1, page: 1, limit: 20, totalPages: 1 } },
    });
    const { result } = renderHook(
      () => useAdminListQuery('/admin/bookings', 'all-bookings', true, 'BOOKINGS', '', 1),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([{ id: 'b1' }]);
    expect(result.current.pagination?.total).toBe(1);
  });

  it('does not fetch (or load) while the tab is disabled', () => {
    mockedGet.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(
      () => useAdminListQuery('/admin/bookings', 'all-bookings', false, 'BOOKINGS', '', 1),
      { wrapper },
    );
    expect(mockedGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual([]);
  });
});
