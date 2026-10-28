import {
  buildSearchEventFilters,
  normalizeSearchQuery,
  recordSearchEvent,
  SEARCH_QUERY_MAX_LENGTH,
} from './search-events';

describe('normalizeSearchQuery', () => {
  it('trims and returns the query', () => {
    expect(normalizeSearchQuery('  atlas trek  ')).toBe('atlas trek');
  });

  it('caps the stored length', () => {
    const long = 'a'.repeat(SEARCH_QUERY_MAX_LENGTH + 50);
    expect(normalizeSearchQuery(long)).toHaveLength(SEARCH_QUERY_MAX_LENGTH);
  });

  it('returns null for blank or non-string input', () => {
    expect(normalizeSearchQuery('   ')).toBeNull();
    expect(normalizeSearchQuery('')).toBeNull();
    expect(normalizeSearchQuery(undefined)).toBeNull();
    expect(normalizeSearchQuery(42)).toBeNull();
  });
});

describe('buildSearchEventFilters', () => {
  it('keeps only allowlisted keys', () => {
    const out = buildSearchEventFilters({
      category: 'ADVENTURE',
      priceMax: 900,
      available: true,
      // not allowlisted — must be dropped
      page: 3,
      limit: 5,
      sortBy: 'price',
      status: 'ACTIVE',
      q: 'atlas',
      travelerId: 'traveller-123',
      ip: '203.0.113.7',
    } as any);
    expect(out).toEqual({ category: 'ADVENTURE', priceMax: 900, available: true });
  });

  it('converts Dates to ISO strings and omits null/undefined', () => {
    const from = new Date('2026-11-01T00:00:00.000Z');
    const out = buildSearchEventFilters({
      startDateFrom: from,
      startDateTo: undefined,
      currency: null,
      ratingMin: 4,
    } as any);
    expect(out).toEqual({ startDateFrom: '2026-11-01T00:00:00.000Z', ratingMin: 4 });
  });

  it('drops non-primitive values and tolerates missing input', () => {
    expect(buildSearchEventFilters({ category: { nested: true } } as any)).toEqual({});
    expect(buildSearchEventFilters(undefined)).toEqual({});
  });
});

describe('recordSearchEvent', () => {
  it('writes one row with normalized query, allowlisted filters and the result count', async () => {
    const create = jest.fn().mockResolvedValue({});
    await recordSearchEvent(
      { searchEvent: { create } },
      { query: ' merzouga ', filters: { category: 'ADVENTURE', page: 2 } as any, resultCount: 0 },
    );
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data).toEqual({
      query: 'merzouga',
      filters: { category: 'ADVENTURE' },
      resultCount: 0,
    });
  });

  it('never throws when the write fails', async () => {
    const create = jest.fn().mockRejectedValue(new Error('db down'));
    await expect(
      recordSearchEvent({ searchEvent: { create } }, { query: 'x', resultCount: 3 }),
    ).resolves.toBeUndefined();
  });

  it('no-ops when the delegate is unavailable (pre-migration / test doubles)', async () => {
    await expect(recordSearchEvent({}, { resultCount: 1 })).resolves.toBeUndefined();
    await expect(recordSearchEvent(null, { resultCount: 1 })).resolves.toBeUndefined();
  });

  it('clamps a negative or non-finite result count to 0', async () => {
    const create = jest.fn().mockResolvedValue({});
    await recordSearchEvent({ searchEvent: { create } }, { resultCount: -4 });
    expect(create.mock.calls[0][0].data.resultCount).toBe(0);
  });
});
