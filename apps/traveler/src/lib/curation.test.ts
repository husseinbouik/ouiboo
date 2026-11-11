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
  pickStoryExcerpt,
  showcaseDestinations,
  storyExcerptText,
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

describe('story strip excerpt (#926)', () => {
  const VERBATIM =
    'Ride camels to the camp at dusk, dinner and music by the fire, a night in a comfort tent, then sunrise over the Erg Chebbi dunes before riding back.';

  it('returns a fitting description verbatim (an exact substring, no rewriting)', () => {
    expect(storyExcerptText(VERBATIM)).toBe(VERBATIM);
  });

  it('rejects stubs below the floor — fixture descriptions never qualify', () => {
    expect(storyExcerptText('Batch F witness fixture trip.')).toBeNull();
    expect(storyExcerptText('   ')).toBeNull();
  });

  it('cuts at a sentence boundary when the text overflows the budget', () => {
    const long =
      'Leave Merzouga in the late afternoon and ride camels deep into the dunes to reach the camp before dark. ' +
      'Dinner and music by the fire follow, then a night in a comfort tent under a sky full of stars, and sunrise over the dunes before the long ride back to the village.';
    const text = storyExcerptText(long);
    expect(text).toBe(
      'Leave Merzouga in the late afternoon and ride camels deep into the dunes to reach the camp before dark.',
    );
    expect(text?.endsWith('…')).toBe(false);
  });

  it('falls back to a word boundary with an ellipsis when no sentence fits', () => {
    const one = 'word '.repeat(80).trim();
    const text = storyExcerptText(one);
    expect(text?.endsWith('…')).toBe(true);
    expect((text ?? '').length).toBeLessThanOrEqual(221);
    expect(one.startsWith((text ?? '').slice(0, -1))).toBe(true);
  });

  it('the picker walks the given order and skips stubs', () => {
    const trips = [
      { id: 'stub', title: 'Fixture', description: 'Short.' },
      { id: 'real', title: 'Blue Pearl', description: VERBATIM },
      { id: 'later', title: 'Other Trip', description: VERBATIM },
    ];
    expect(pickStoryExcerpt(trips)).toEqual({ tripId: 'real', title: 'Blue Pearl', text: VERBATIM });
  });

  it('the picker returns null when nothing qualifies', () => {
    expect(pickStoryExcerpt([{ id: 'x', title: 'T', description: 'Short.' }])).toBeNull();
    expect(pickStoryExcerpt([])).toBeNull();
  });
});
