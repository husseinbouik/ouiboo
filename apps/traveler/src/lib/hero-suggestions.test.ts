/**
 * Search-Interface Council adoption (#938): the hero suggestion
 * model — completeness (item 10), the D3 zero-trip separation
 * (item 1) and the tile-row rule-based set (item 12).
 */
import { buildHeroSuggestions, type HeroSuggestionTrip } from './hero-suggestions';

const NAMES = { tangier: 'Tangier', tetouan: 'Tétouan', chefchaouen: 'Chefchaouen' };

function trip(partial: Partial<HeroSuggestionTrip> & { id: string }): HeroSuggestionTrip {
  return {
    title: 'Trip',
    images: [],
    sessions: [],
    agency: { id: 'agency-1' },
    ...partial,
  } as HeroSuggestionTrip;
}

const CATALOG: HeroSuggestionTrip[] = [
  trip({
    id: 'tng-1',
    title: 'Tangier Kasbah Walk',
    destinationSlug: 'tangier',
    startLocation: 'Tangier',
    durationDays: 1,
    sessions: [{ price: 400, currency: 'MAD' }],
    agency: { id: 'agency-1' },
  }),
  trip({
    id: 'tng-2',
    title: 'Tangier Food Tour',
    destinationSlug: 'tangier',
    startLocation: 'Tangier',
    durationDays: 1,
    sessions: [{ price: 600, currency: 'MAD' }],
    agency: { id: 'agency-1' },
  }),
  trip({
    id: 'chef-1',
    title: 'Blue Pearl Photography',
    destinationSlug: 'chefchaouen',
    startLocation: 'Chefchaouen',
    durationDays: 2,
    sessions: [{ price: 700, currency: 'MAD' }],
    agency: { id: 'agency-2' },
  }),
  trip({
    id: 'merz-1',
    title: 'Merzouga Camel Trek',
    destinationSlug: null,
    startLocation: 'Merzouga',
    durationDays: 2,
    sessions: [{ price: 1200, currency: 'MAD' }],
    agency: { id: 'agency-3' },
  }),
  trip({
    id: 'merz-2',
    title: 'Dunes Night',
    destinationSlug: null,
    startLocation: 'Merzouga, Morocco',
    durationDays: 1,
    sessions: [{ price: 900, currency: 'MAD' }],
    agency: { id: 'agency-4' },
  }),
  trip({
    id: 'casa-1',
    title: 'Casablanca & Rabat Heritage Tour',
    destinationSlug: null,
    startLocation: 'Casablanca',
    durationDays: 1,
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200',
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=1200',
    ],
    sessions: [{ price: 800, currency: 'MAD' }],
    agency: { id: 'agency-5' },
  }),
];

describe('buildHeroSuggestions (#938)', () => {
  it('lists every destination with trips — cluster-first, then by count — with Casablanca included (item 10/12)', () => {
    const model = buildHeroSuggestions(CATALOG, '', NAMES);
    expect(model.destinations.map((d) => d.name)).toEqual([
      'Tangier',
      'Chefchaouen',
      'Merzouga',
      'Casablanca',
    ]);
    expect(model.destinations.map((d) => d.count)).toEqual([2, 1, 2, 1]);
    expect(model.totalTrips).toBe(6);
    // Cluster destinations carry the facet href; other places the
    // free-text href the coverage tiles have always used.
    expect(model.destinations[0].href).toBe('/search?destination=tangier');
    expect(model.destinations[2].href).toBe('/search?q=Merzouga');
    // From-prices come from the live record.
    expect(model.destinations[0].minPrice).toBe(400);
    expect(model.destinations[2].minPrice).toBe(900);
  });

  it('keeps the zero-trip place OUT of the destinations and in the zero zone (D3)', () => {
    const model = buildHeroSuggestions(CATALOG, '', NAMES);
    expect(model.destinations.some((d) => d.slug === 'tetouan')).toBe(false);
    expect(model.zeroPlaces).toEqual([
      { slug: 'tetouan', name: 'Tétouan', photo: '/images/destinations/tetouan.jpg' },
    ]);
  });

  it('typing the zero-trip place surfaces it only in the zero zone', () => {
    const model = buildHeroSuggestions(CATALOG, 'Tétouan', NAMES);
    expect(model.destinations).toEqual([]);
    expect(model.trips).toEqual([]);
    expect(model.zeroPlaces.map((p) => p.slug)).toEqual(['tetouan']);
  });

  it('filters destinations by the typed query', () => {
    const model = buildHeroSuggestions(CATALOG, 'merz', NAMES);
    expect(model.destinations.map((d) => d.name)).toEqual(['Merzouga']);
    expect(model.zeroPlaces).toEqual([]);
  });

  it('caps trip suggestions at one per agency (item 10 fairness)', () => {
    const model = buildHeroSuggestions(CATALOG, 'Tangier', NAMES);
    const titles = model.trips.map((suggestion) => suggestion.title);
    expect(titles).toContain('Tangier Kasbah Walk');
    expect(titles).not.toContain('Tangier Food Tour');
    expect(model.trips[0]).toMatchObject({
      place: 'Tangier',
      durationDays: 1,
      minPrice: 400,
      href: '/trip/tng-1',
    });
  });

  it('renders the curated static for a place whose trip media holds no truthful photo (#898)', () => {
    const model = buildHeroSuggestions(CATALOG, '', NAMES);
    const casablanca = model.destinations.find((d) => d.name === 'Casablanca');
    expect(casablanca?.photo).toBe('/images/destinations/casablanca.jpg');
    const merzouga = model.destinations.find((d) => d.name === 'Merzouga');
    expect(merzouga?.photo).toBeNull();
  });

  it('offers no trip suggestions for an empty query', () => {
    expect(buildHeroSuggestions(CATALOG, '', NAMES).trips).toEqual([]);
  });
});
