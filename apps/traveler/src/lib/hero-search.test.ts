/**
 * @jest-environment jsdom
 *
 * #723: hero search destination resolution + canonical param building.
 * The contract under test is the search page's own: `destination` holds
 * a BETA_DESTINATIONS slug, free text travels as `q`, and dates travel
 * as `dateFrom`/`dateTo` (never the legacy `date` alias).
 */
import {
  buildHeroSearchParams,
  isInvalidDateRange,
  resolveDestinationSlug,
} from './hero-search';

describe('resolveDestinationSlug (#723)', () => {
  it('resolves the canonical names of every beta destination', () => {
    expect(resolveDestinationSlug('Chefchaouen')).toBe('chefchaouen');
    expect(resolveDestinationSlug('Tangier')).toBe('tangier');
    expect(resolveDestinationSlug('Tetouan')).toBe('tetouan');
  });

  it('resolves configured aliases across EN/FR/AR spellings', () => {
    expect(resolveDestinationSlug('Tanger')).toBe('tangier');
    expect(resolveDestinationSlug('طنجة')).toBe('tangier');
    expect(resolveDestinationSlug('Tétouan')).toBe('tetouan');
    expect(resolveDestinationSlug('تطوان')).toBe('tetouan');
    expect(resolveDestinationSlug('Chaouen')).toBe('chefchaouen');
    expect(resolveDestinationSlug('شفشاون')).toBe('chefchaouen');
  });

  it('is case- and diacritic-insensitive and trims whitespace', () => {
    expect(resolveDestinationSlug('  CHEFCHAOUEN ')).toBe('chefchaouen');
    expect(resolveDestinationSlug('tetouan')).toBe('tetouan');
  });

  it('resolves the localised display name in the active language', () => {
    expect(resolveDestinationSlug('Tanger', { tangier: 'Tanger' })).toBe('tangier');
  });

  it('resolves a unique prefix, and refuses ambiguous or unknown text', () => {
    expect(resolveDestinationSlug('chef')).toBe('chefchaouen');
    expect(resolveDestinationSlug('t')).toBe('');
    expect(resolveDestinationSlug('Marrakech')).toBe('');
    expect(resolveDestinationSlug('atlas mountains')).toBe('');
    expect(resolveDestinationSlug('')).toBe('');
  });
});

describe('buildHeroSearchParams (#723)', () => {
  it('emits the destination facet — not q — for a known destination', () => {
    const params = buildHeroSearchParams({ query: 'Chefchaouen', dateFrom: '', dateTo: '' });
    expect(params.get('destination')).toBe('chefchaouen');
    expect(params.get('q')).toBeNull();
  });

  it('falls back to q for free text that is not a configured destination', () => {
    const params = buildHeroSearchParams({ query: 'atlas', dateFrom: '', dateTo: '' });
    expect(params.get('q')).toBe('atlas');
    expect(params.get('destination')).toBeNull();
  });

  it('emits dates under the canonical dateFrom/dateTo names', () => {
    const params = buildHeroSearchParams({
      query: 'Tangier',
      dateFrom: '2026-11-10',
      dateTo: '2026-11-12',
    });
    expect(params.get('dateFrom')).toBe('2026-11-10');
    expect(params.get('dateTo')).toBe('2026-11-12');
    expect(params.get('date')).toBeNull();
  });

  it('emits no params at all for an empty search (unfiltered /search)', () => {
    const params = buildHeroSearchParams({ query: '   ', dateFrom: '', dateTo: '' });
    expect(params.toString()).toBe('');
  });
});

describe('isInvalidDateRange (#723)', () => {
  it('flags end-before-start only when both dates are present', () => {
    expect(isInvalidDateRange('2026-11-12', '2026-11-10')).toBe(true);
    expect(isInvalidDateRange('2026-11-10', '2026-11-12')).toBe(false);
    expect(isInvalidDateRange('2026-11-10', '2026-11-10')).toBe(false);
    expect(isInvalidDateRange('2026-11-10', '')).toBe(false);
    expect(isInvalidDateRange('', '2026-11-10')).toBe(false);
  });
});
