import { Logger } from '@nestjs/common';

/**
 * #432 / B21 (Council Session #2): the public catalog search-event log.
 *
 * One row per public catalog search (GET /trips), recorded server-side.
 * The log exists to measure the beta's zero-result rate (exit criterion:
 * zero-result searches <= 20% of all searches). It is cookie-free and
 * identifier-free BY CONSTRUCTION:
 *  - no traveller/user id, no IP, no user agent, no session linkage;
 *  - the filter snapshot is built from a strict allowlist (below), so
 *    arbitrary client-supplied keys can never land in the record;
 *  - the query text is the traveller's own search string, trimmed and
 *    length-capped, stored with no identity attached to it.
 *
 * Recording is best-effort: a search must never fail because its
 * measurement failed, so `recordSearchEvent` swallows every error.
 */

const logger = new Logger('SearchEvents');

/** Max stored length of a traveller-typed search string. */
export const SEARCH_QUERY_MAX_LENGTH = 200;

/**
 * The allowlisted filter keys a SearchEvent may carry — exactly the
 * public catalog's filter surface (see TripsController.findAll /
 * TripsService.findAllTemplates), minus pagination, sorting and the
 * internal `status`/`recordSearch` plumbing. Values are primitives or
 * ISO date strings only.
 */
export const SEARCH_EVENT_FILTER_KEYS = [
  'featured',
  'category',
  'agencyId',
  'currency',
  'priceMin',
  'priceMax',
  'durationMin',
  'durationMax',
  'ratingMin',
  'available',
  'startDateFrom',
  'startDateTo',
] as const;

export type SearchEventFilters = Partial<
  Record<(typeof SEARCH_EVENT_FILTER_KEYS)[number], string | number | boolean>
>;

/** Normalize a raw query string for storage: trim + length cap. */
export function normalizeSearchQuery(q: unknown): string | null {
  if (typeof q !== 'string') return null;
  const trimmed = q.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, SEARCH_QUERY_MAX_LENGTH);
}

/**
 * Build the allowlisted filter snapshot from raw findAllTemplates
 * filters. Unknown keys are dropped; Dates become ISO strings;
 * undefined/null values are omitted.
 */
export function buildSearchEventFilters(filters: Record<string, unknown> | undefined): SearchEventFilters {
  const out: SearchEventFilters = {};
  if (!filters) return out;
  for (const key of SEARCH_EVENT_FILTER_KEYS) {
    const value = filters[key];
    if (value === undefined || value === null) continue;
    if (value instanceof Date) {
      out[key] = value.toISOString();
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    }
  }
  return out;
}

export interface SearchEventInput {
  query?: unknown;
  filters?: Record<string, unknown>;
  resultCount: number;
}

/**
 * Append one SearchEvent row. Never throws: measurement must not break
 * the search it measures (this also keeps pre-migration environments
 * and unit-test doubles without a `searchEvent` delegate safe).
 */
export async function recordSearchEvent(db: any, input: SearchEventInput): Promise<void> {
  try {
    if (!db || typeof db.searchEvent?.create !== 'function') return;
    const resultCount = Number.isFinite(input.resultCount) ? Math.max(0, Math.floor(input.resultCount)) : 0;
    await db.searchEvent.create({
      data: {
        query: normalizeSearchQuery(input.query),
        filters: buildSearchEventFilters(input.filters),
        resultCount,
      },
    });
  } catch (error) {
    logger.warn(`Failed to record search event: ${(error as Error)?.message ?? 'unknown error'}`);
  }
}
