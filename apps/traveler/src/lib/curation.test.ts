/**
 * #885: the published featured-curation rule, locked as behaviour:
 * max 1 trip per agency, at least 2 agencies whenever 2+ agencies
 * have cluster supply, weekly rotation, cluster scoping (no
 * out-of-cluster backfill), honest counts.
 */
import {
  countTripsByCategory,
  countTripsByDestination,
  curateFeaturedTrips,
  effectiveDestinationSlug,
  isoWeekNumber,
  type CurationTrip,
} from './curation';

function trip(partial: Partial<CurationTrip> & { id: string }): CurationTrip {
  return {
    featured: false,
    destinationSlug: 'tangier',
    category: 'ADVENTURE',
    createdAt: '2026-11-01T00:00:00.000Z',
    agency: { id: 'agency-a' },
    sessions: [{ startDate: '2027-01-10T00:00:00.000Z', status: 'OPEN' }],
    ...partial,
  };
}

describe('curateFeaturedTrips (#885)', () => {
  it('shows at most one trip per agency and spans agencies', () => {
    const rail = curateFeaturedTrips([
      trip({ id: 'a1' }),
      trip({ id: 'a2' }),
      trip({ id: 'b1', agency: { id: 'agency-b' } }),
      trip({ id: 'c1', agency: { id: 'agency-c' } }),
    ]);
    const agencies = rail.map((t) => t.agency?.id);
    expect(new Set(agencies).size).toBe(agencies.length);
    expect(agencies.length).toBe(3);
    expect(new Set(agencies)).toEqual(new Set(['agency-a', 'agency-b', 'agency-c']));
  });

  it('prefers the agency-flagged featured trip as its champion', () => {
    const rail = curateFeaturedTrips([
      trip({ id: 'plain', createdAt: '2026-11-05T00:00:00.000Z' }),
      trip({ id: 'flagged', featured: true, createdAt: '2026-10-01T00:00:00.000Z' }),
    ]);
    expect(rail.map((t) => t.id)).toEqual(['flagged']);
  });

  it('prefers an upcoming departure over the featured flag (the published criteria order)', () => {
    const rail = curateFeaturedTrips([
      trip({ id: 'flagged-no-departure', featured: true, sessions: [{ startDate: '2020-01-01T00:00:00.000Z', status: 'OPEN' }] }),
      trip({ id: 'plain-upcoming', featured: false }),
    ]);
    expect(rail.map((t) => t.id)).toEqual(['plain-upcoming']);
  });

  it('never backfills with out-of-cluster trips', () => {
    const rail = curateFeaturedTrips([
      trip({ id: 'imlil', destinationSlug: null }),
      trip({ id: 'merzouga', destinationSlug: 'merzouga' }),
      trip({ id: 'cluster', destinationSlug: 'chefchaouen' }),
    ]);
    expect(rail.map((t) => t.id)).toEqual(['cluster']);
  });

  it('derives cluster eligibility from startLocation when the slug was never stamped', () => {
    // Mirrors the API's destinations.util facet derivation: an
    // unstamped trip departing Chefchaouen is cluster supply, while
    // one departing Fes is not.
    expect(effectiveDestinationSlug(trip({ id: 'x', destinationSlug: null, startLocation: 'Chefchaouen' }))).toBe('chefchaouen');
    expect(effectiveDestinationSlug(trip({ id: 'x', destinationSlug: null, startLocation: { en: 'Tétouan — départ médina' } }))).toBe('tetouan');
    expect(effectiveDestinationSlug(trip({ id: 'x', destinationSlug: null, startLocation: 'Fes' }))).toBeNull();
    expect(effectiveDestinationSlug(trip({ id: 'x', destinationSlug: 'tangier', startLocation: 'Fes' }))).toBe('tangier');
    expect(effectiveDestinationSlug(trip({ id: 'x', destinationSlug: 'merzouga', startLocation: 'Tangier' }))).toBeNull();
    const rail = curateFeaturedTrips([
      trip({ id: 'unstamped-blue', destinationSlug: null, startLocation: 'Chefchaouen', agency: { id: 'agency-a' } }),
      trip({ id: 'stamped-tanger', destinationSlug: 'tangier', agency: { id: 'agency-b' } }),
    ]);
    expect(new Set(rail.map((t) => t.id))).toEqual(new Set(['unstamped-blue', 'stamped-tanger']));
  });

  it('rotates the agency order by ISO week', () => {
    const trips = [
      trip({ id: 'a1' }),
      trip({ id: 'b1', agency: { id: 'agency-b' } }),
      trip({ id: 'c1', agency: { id: 'agency-c' } }),
      trip({ id: 'd1', agency: { id: 'agency-d' } }),
    ];
    // 2026-11-02 is ISO week 45; 2026-11-09 is week 46.
    const week45 = curateFeaturedTrips(trips, new Date('2026-11-02T12:00:00Z')).map((t) => t.id);
    const week46 = curateFeaturedTrips(trips, new Date('2026-11-09T12:00:00Z')).map((t) => t.id);
    expect(week45).toHaveLength(3);
    expect(week46).toHaveLength(3);
    expect(week45).not.toEqual(week46);
    // Rotation changes which agency is cut, not the one-per-agency rule.
    expect(new Set([...week45, ...week46]).size).toBe(4);
  });

  it('returns an empty rail when no agency has cluster supply', () => {
    expect(curateFeaturedTrips([trip({ id: 'x', destinationSlug: null })])).toEqual([]);
    expect(curateFeaturedTrips([])).toEqual([]);
  });
});

describe('isoWeekNumber', () => {
  it('matches known ISO weeks', () => {
    expect(isoWeekNumber(new Date('2026-01-01T12:00:00Z'))).toBe(1);
    expect(isoWeekNumber(new Date('2026-11-02T12:00:00Z'))).toBe(45);
    expect(isoWeekNumber(new Date('2026-12-31T12:00:00Z'))).toBe(53);
  });
});

describe('catalogue counts (#885)', () => {
  it('counts cluster destinations with honest zeros', () => {
    const counts = countTripsByDestination([
      trip({ id: '1', destinationSlug: 'tangier' }),
      trip({ id: '2', destinationSlug: 'tangier' }),
      trip({ id: '3', destinationSlug: 'chefchaouen' }),
      trip({ id: '4', destinationSlug: null }),
      trip({ id: '5', destinationSlug: null, startLocation: 'Chefchaouen' }),
    ]);
    expect(counts).toEqual({ tangier: 2, tetouan: 0, chefchaouen: 2 });
  });

  it('counts categories case-insensitively by API value', () => {
    const counts = countTripsByCategory([
      trip({ id: '1', category: 'ADVENTURE' }),
      trip({ id: '2', category: 'Adventure' }),
      trip({ id: '3', category: 'LUXURY' }),
    ]);
    expect(counts).toEqual({ ADVENTURE: 2, LUXURY: 1 });
  });
});
