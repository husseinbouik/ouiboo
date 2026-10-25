import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toPaginatedList, type PaginationMeta } from '@ouiboo/utils';
import type { AdminTab } from './types';
import { ADMIN_PAGE_LIMIT } from './dashboard-utils';

type AdminListResponse = {
  data: unknown;
  pagination: PaginationMeta | null;
};

export const useAdminListQuery = <T,>(
  path: string,
  queryKeyKey: string,
  enabled: boolean,
  activeTab: AdminTab,
  debouncedQuery: string,
  currentPage: number,
  extraParams?: Record<string, string>,
) => {
  const { data: raw, isLoading } = useQuery<unknown>({
    queryKey: [queryKeyKey, activeTab, debouncedQuery, currentPage, extraParams],
    queryFn: async () => {
      const resp = await apiClient.get(path, {
        params: {
          page: currentPage,
          limit: ADMIN_PAGE_LIMIT,
          ...(debouncedQuery ? { q: debouncedQuery } : {}),
          ...(extraParams ?? {}),
        },
      });
      return resp.data as AdminListResponse;
    },
    enabled,
    placeholderData: (prev: unknown) => prev,
  });
  // isLoading is true only on a cold load (no cached/placeholder data), so
  // surfaces can show a skeleton instead of flashing their empty state (#469).
  return { ...toPaginatedList<T>(raw), isLoading };
};
