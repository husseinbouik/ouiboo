export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedList<T> {
  data: T[];
  pagination: PaginationMeta | null;
}

export const toPaginatedList = <T>(raw: unknown): PaginatedList<T> => {
  if (Array.isArray(raw)) {
    return { data: raw as T[], pagination: null };
  }
  if (raw && typeof raw === 'object') {
    const candidate = raw as { data?: unknown; pagination?: unknown };
    if (Array.isArray(candidate.data)) {
      return {
        data: candidate.data as T[],
        pagination: (candidate.pagination ?? null) as PaginationMeta | null,
      };
    }
  }
  return { data: [], pagination: null };
};