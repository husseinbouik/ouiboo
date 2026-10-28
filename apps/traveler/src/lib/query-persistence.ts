import type { QueryClient } from '@tanstack/react-query';

/**
 * Targeted React Query cache persistence for PUBLIC content only (#333).
 *
 * Repeat visits should paint instantly on slow connections: snapshots of the
 * public trip catalog (list + detail) are kept in localStorage and restored
 * into the cache before the first render, marked with their real fetch time
 * so React Query treats them as stale and refetches in the background.
 *
 * User/session data is NEVER persisted: the allowlist below only matches the
 * public trip query keys (`['ouiboo', 'trips', ...]` from
 * @ouiboo/api-client and the traveler app's `['trip', id]` detail key).
 */

// v2 (content-language audit, #546): trip detail keys now carry the UI
// locale, so snapshots restore per language. The version bump drops
// every v1 snapshot — they were keyed locale-lessly and could replay a
// payload in the wrong language.
const STORAGE_KEY = 'ouiboo.public-query-cache.v2';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // snapshots older than a day are dropped
const MAX_BYTES = 2 * 1024 * 1024; // stay well under the localStorage quota

type Snapshot = {
  queryKey: unknown[];
  data: unknown;
  dataUpdatedAt: number;
};

function isPublicQueryKey(queryKey: readonly unknown[]): boolean {
  return (
    (queryKey[0] === 'ouiboo' && queryKey[1] === 'trips') ||
    queryKey[0] === 'trip'
  );
}

export function restorePublicQueryCache(client: QueryClient): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as Snapshot[];
    if (!Array.isArray(entries)) return;
    const now = Date.now();
    for (const entry of entries) {
      if (!entry || !Array.isArray(entry.queryKey)) continue;
      if (!isPublicQueryKey(entry.queryKey)) continue;
      if (typeof entry.dataUpdatedAt !== 'number') continue;
      if (now - entry.dataUpdatedAt > MAX_AGE_MS) continue;
      client.setQueryData(entry.queryKey, entry.data, {
        updatedAt: entry.dataUpdatedAt,
      });
    }
  } catch {
    // Corrupted or unavailable storage: start with an empty cache.
  }
}

export function subscribePublicQueryCache(client: QueryClient): () => void {
  if (typeof window === 'undefined') return () => undefined;
  let timer: number | undefined;

  const write = () => {
    try {
      const entries: Snapshot[] = client
        .getQueryCache()
        .getAll()
        .filter(
          (query) =>
            isPublicQueryKey(query.queryKey) &&
            query.state.status === 'success' &&
            query.state.data !== undefined
        )
        .map((query) => ({
          queryKey: query.queryKey as unknown[],
          data: query.state.data,
          dataUpdatedAt: query.state.dataUpdatedAt,
        }));
      const serialized = JSON.stringify(entries);
      if (serialized.length > MAX_BYTES) return;
      window.localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      // Quota exceeded or storage unavailable: persistence is best-effort.
    }
  };

  const unsubscribe = client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') return;
    if (!isPublicQueryKey(event.query.queryKey)) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(write, 400);
  });

  return () => {
    window.clearTimeout(timer);
    unsubscribe();
  };
}
