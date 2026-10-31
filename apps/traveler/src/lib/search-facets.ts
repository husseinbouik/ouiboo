import { BETA_DESTINATIONS } from "@ouiboo/types";

/**
 * #675: traveller search facet helpers shared by the client search UI
 * and the server-rendered search page. They live OUTSIDE SearchClient
 * on purpose: that module is a Client Component, and Next.js forbids
 * invoking its exported functions from the server.
 */

/**
 * Duration facet buckets (trip length in days). The bucket key travels
 * in the `duration` URL param; the API receives the resolved
 * durationMin/durationMax range (its parameters existed and were
 * parsed server-side — the traveller side never sent them).
 */
export const DURATION_BUCKETS = [
  { key: "1", min: 1, max: 1 },
  { key: "2-3", min: 2, max: 3 },
  { key: "4-7", min: 4, max: 7 },
  { key: "8+", min: 8, max: undefined },
] as const;

export function durationBucketRange(key: string): { min: number; max?: number } | null {
  const bucket = DURATION_BUCKETS.find((candidate) => candidate.key === key);
  return bucket ? { min: bucket.min, max: bucket.max } : null;
}

export function isDurationBucketKey(key: string): boolean {
  return DURATION_BUCKETS.some((bucket) => bucket.key === key);
}

export function isDestinationSlugValue(value: string): boolean {
  return BETA_DESTINATIONS.some((destination) => destination.slug === value);
}
