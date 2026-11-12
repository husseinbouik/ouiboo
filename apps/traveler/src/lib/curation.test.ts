/**
 * #885: the published featured-curation rule, locked as behaviour:
 * max 1 trip per agency, at least 2 agencies whenever 2+ agencies
 * have cluster supply, weekly rotation, cluster scoping (no
 * out-of-cluster backfill), honest counts.
 */
import {
  buildLeavingSoonRows,
  countTripsByCategory,
  countTripsByDestination,
  curateFeaturedTrips,
  effectiveDestinationSlug,
  hasUpcomingDeparture,
  isoWeekNumber,
  nextBookableSession,
  showcaseDestinations,
  tripsCoverPlace,
  type CurationTrip,
  type ShowcaseTrip,
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

describe('next-session predicate (search-page council items 14 + 17)', () => {
  const now = new Date('2026-11-12T00:00:00.000Z');

  it('counts a future OPEN session with seats as an upcoming departure', () => {
    const t1 = trip({ id: 'x', sessions: [{ startDate: '2026-12-01T00:00:00.000Z', status: 'OPEN', availableSeats: 4 }] });
    expect(hasUpcomingDeparture(t1, now)).toBe(true);
    expect(nextBookableSession(t1, now)?.spotsLeft).toBe(4);
  });

  it('a future session that is CANCELLED is not a departure', () => {
    const t1 = trip({ id: 'x', sessions: [{ startDate: '2026-12-01T00:00:00.000Z', status: 'CANCELLED', availableSeats: 4 }] });
    expect(hasUpcomingDeparture(t1, now)).toBe(false);
  });

  it('a future OPEN session with zero seats is FULL — not a departure', () => {
    const t1 = trip({ id: 'x', sessions: [{ startDate: '2026-12-01T00:00:00.000Z', status: 'OPEN', availableSeats: 0 }] });
    expect(hasUpcomingDeparture(t1, now)).toBe(false);
    expect(nextBookableSession(t1, now)).toBeNull();
  });

  it('unknown seat data never reads as full', () => {
    const t1 = trip({ id: 'x', sessions: [{ startDate: '2026-12-01T00:00:00.000Z', status: 'OPEN' }] });
    expect(hasUpcomingDeparture(t1, now)).toBe(true);
    expect(nextBookableSession(t1, now)?.spotsLeft).toBeNull();
  });

  it('picks the earliest BOOKABLE session, skipping a filled earlier one', () => {
    const t1 = trip({
      id: 'x',
      sessions: [
        { startDate: '2026-11-20T00:00:00.000Z', status: 'OPEN', availableSeats: 0 },
        { startDate: '2026-11-27T00:00:00.000Z', status: 'OPEN', availableSeats: 2 },
      ],
    });
    expect(nextBookableSession(t1, now)?.session.startDate).toBe('2026-11-27T00:00:00.000Z');
  });

  it("item 14 verification: a trip whose only future session is full produces no champion over a bookable agency-mate", () => {
    const rail = curateFeaturedTrips(
      [
        trip({ id: 'flagged-full', featured: true, sessions: [{ startDate: '2027-01-10T00:00:00.000Z', status: 'OPEN', availableSeats: 0 }] }),
        trip({ id: 'plain-open', featured: false }),
      ],
      now,
    );
    expect(rail.map((t) => t.id)).toEqual(['plain-open']);
  });
});

describe('buildLeavingSoonRows (#961 — FC strip conditions)', () => {
  const now = new Date('2026-11-12T00:00:00.000Z');
  const sess = (startDate: string, extra: Record<string, unknown> = {}) => ({
    startDate,
    status: 'OPEN',
    ...extra,
  });

  it('orders live rows by date, ties by fewest spots left', () => {
    const result = buildLeavingSoonRows(
      [
        trip({ id: 'later', agency: { id: 'ag-1' }, sessions: [sess('2026-11-25T00:00:00.000Z', { availableSeats: 2 })] }),
        trip({ id: 'tie-many', agency: { id: 'ag-2' }, sessions: [sess('2026-11-20T00:00:00.000Z', { availableSeats: 9 })] }),
        trip({ id: 'tie-few', agency: { id: 'ag-3' }, sessions: [sess('2026-11-20T00:00:00.000Z', { availableSeats: 3 })] }),
      ],
      { now },
    );
    expect(result.decision).toBe('strip');
    expect(result.rows.map((r) => r.trip.id)).toEqual(['tie-few', 'tie-many', 'later']);
  });

  it('caps live rows at two per agency', () => {
    const result = buildLeavingSoonRows(
      [
        trip({ id: 'a1', sessions: [sess('2026-11-15T00:00:00.000Z')] }),
        trip({ id: 'a2', sessions: [sess('2026-11-16T00:00:00.000Z')] }),
        trip({ id: 'a3', sessions: [sess('2026-11-17T00:00:00.000Z')] }),
        trip({ id: 'b1', agency: { id: 'agency-b' }, sessions: [sess('2026-11-18T00:00:00.000Z')] }),
      ],
      { now },
    );
    expect(result.decision).toBe('strip');
    expect(result.rows.map((r) => r.trip.id)).toEqual(['a1', 'a2', 'b1']);
  });

  it('hides at zero live departures', () => {
    const result = buildLeavingSoonRows(
      [trip({ id: 'past', sessions: [sess('2026-11-01T00:00:00.000Z')] })],
      { now },
    );
    expect(result).toEqual({ decision: 'hidden', rows: [] });
  });

  it('folds exactly one live departure into the endcap', () => {
    const result = buildLeavingSoonRows(
      [trip({ id: 'only', sessions: [sess('2026-11-20T00:00:00.000Z')] })],
      { now },
    );
    expect(result.decision).toBe('endcap');
    expect(result.rows.map((r) => r.trip.id)).toEqual(['only']);
  });

  it('hides when the only departure already sits in Selected (mere duplication)', () => {
    const result = buildLeavingSoonRows(
      [trip({ id: 'only', sessions: [sess('2026-11-20T00:00:00.000Z')] })],
      { now, selectedTripIds: ['only'] },
    );
    expect(result.decision).toBe('hidden');
  });

  it('hides when every live row duplicates Selected', () => {
    const result = buildLeavingSoonRows(
      [
        trip({ id: 's1', sessions: [sess('2026-11-20T00:00:00.000Z')] }),
        trip({ id: 's2', agency: { id: 'agency-b' }, sessions: [sess('2026-11-21T00:00:00.000Z')] }),
      ],
      { now, selectedTripIds: ['s1', 's2'] },
    );
    expect(result.decision).toBe('hidden');
  });

  it('appends at most one tombstone — the soonest filled session — never counted as live', () => {
    const result = buildLeavingSoonRows(
      [
        trip({ id: 'live-1', agency: { id: 'ag-1' }, sessions: [sess('2026-11-20T00:00:00.000Z', { availableSeats: 5 })] }),
        trip({ id: 'live-2', agency: { id: 'ag-2' }, sessions: [sess('2026-11-22T00:00:00.000Z', { availableSeats: 5 })] }),
        trip({ id: 'filled-late', agency: { id: 'ag-3' }, sessions: [sess('2026-11-25T00:00:00.000Z', { availableSeats: 0 })] }),
        trip({ id: 'filled-soon', agency: { id: 'ag-4' }, sessions: [sess('2026-11-18T00:00:00.000Z', { availableSeats: 0 })] }),
      ],
      { now },
    );
    expect(result.decision).toBe('strip');
    const tombstones = result.rows.filter((r) => r.kind === 'tombstone');
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0].trip.id).toBe('filled-soon');
    expect(result.rows[result.rows.length - 1].kind).toBe('tombstone');
    expect(result.rows.filter((r) => r.kind === 'live')).toHaveLength(2);
  });

  it('a filled session in the past leaves no tombstone', () => {
    const result = buildLeavingSoonRows(
      [
        trip({ id: 'live-1', agency: { id: 'ag-1' }, sessions: [sess('2026-11-20T00:00:00.000Z', { availableSeats: 5 })] }),
        trip({ id: 'live-2', agency: { id: 'ag-2' }, sessions: [sess('2026-11-22T00:00:00.000Z', { availableSeats: 5 })] }),
        trip({ id: 'filled-past', agency: { id: 'ag-3' }, sessions: [sess('2026-11-01T00:00:00.000Z', { availableSeats: 0 })] }),
      ],
      { now },
    );
    expect(result.rows.some((r) => r.kind === 'tombstone')).toBe(false);
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

describe('coverage showcase (round 2, supersedes the home "All trips" listing)', () => {
  function sTrip(partial: Partial<ShowcaseTrip> & { id: string }): ShowcaseTrip {
    return {
      destinationSlug: null,
      startLocation: 'Merzouga',
      title: 'Trip',
      images: [],
      sessions: [],
      agency: { id: 'agency-a' },
      ...partial,
    };
  }

  it('groups by destination, folding the country suffix into one tile', () => {
    const groups = showcaseDestinations([
      sTrip({ id: '1', startLocation: 'Merzouga' }),
      sTrip({ id: '2', startLocation: 'Merzouga, Morocco' }),
      sTrip({ id: '3', startLocation: 'Fes' }),
    ]);
    expect(groups.map((g) => [g.name, g.count])).toEqual([['Merzouga', 2], ['Fes', 1]]);
  });

  it('excludes the cluster destinations (Start in the North covers them)', () => {
    const groups = showcaseDestinations([
      sTrip({ id: '1', destinationSlug: 'tangier', startLocation: 'Tanger' }),
      sTrip({ id: '2', startLocation: 'Essaouira' }),
    ]);
    expect(groups.map((g) => g.name)).toEqual(['Essaouira']);
  });

  it('skips photos already shown on the page when picking a destination photo', () => {
    const groups = showcaseDestinations(
      [
        sTrip({
          id: '1',
          title: 'Casablanca & Rabat Heritage Tour',
          startLocation: 'Casablanca',
          images: [
            'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?q=80&w=1200',
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200',
          ],
        }),
      ],
      ['photo-1539020140153-e479b8c22e70'],
    );
    expect(groups[0].photo).toContain('photo-1507525428034');
  });

  it('derives the from-price and its currency from the cheapest session', () => {
    const groups = showcaseDestinations([
      sTrip({ id: '1', sessions: [{ price: 900, currency: 'MAD' }, { price: 450, currency: 'MAD' }] }),
    ]);
    expect(groups[0].minPrice).toBe(450);
    expect(groups[0].priceCurrency).toBe('MAD');
  });

  it('tripsCoverPlace matches a place across spellings, and only then', () => {
    expect(tripsCoverPlace([sTrip({ id: '1', startLocation: 'Agadir' })], ['agadir', 'أكادير'])).toBe(true);
    expect(tripsCoverPlace([sTrip({ id: '1', startLocation: 'أكادير' })], ['agadir', 'أكادير'])).toBe(true);
    expect(tripsCoverPlace([sTrip({ id: '1', startLocation: 'Fes' })], ['agadir', 'أكادير'])).toBe(false);
  });
});
