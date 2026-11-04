/**
 * #745 (remainder): the location-suffix localizer. Pure function —
 * the localized country name arrives from the locale files
 * (`countries.morocco`), so the tests pin behaviour per target name.
 */
import { localizeLocationSuffix } from './localized-location';

describe('localizeLocationSuffix (#745)', () => {
  it('swaps an English suffix for the French country name', () => {
    expect(localizeLocationSuffix('Merzouga, Morocco', 'Maroc')).toBe('Merzouga, Maroc');
  });

  it('swaps an English suffix for the Arabic country name', () => {
    expect(localizeLocationSuffix('Merzouga, Morocco', 'المغرب')).toBe('Merzouga, المغرب');
  });

  it('swaps a French suffix for the English country name', () => {
    expect(localizeLocationSuffix('Merzouga, Maroc', 'Morocco')).toBe('Merzouga, Morocco');
  });

  it('swaps an Arabic suffix (Arabic comma) for the French country name', () => {
    expect(localizeLocationSuffix('مرزوكة، المغرب', 'Maroc')).toBe('مرزوكة، Maroc');
  });

  it('is a no-op when the suffix already matches the locale', () => {
    expect(localizeLocationSuffix('Merzouga, Maroc', 'Maroc')).toBe('Merzouga, Maroc');
  });

  it('localizes a bare country name whole', () => {
    expect(localizeLocationSuffix('Morocco', 'Maroc')).toBe('Maroc');
  });

  it('leaves locations without a known country suffix untouched', () => {
    expect(localizeLocationSuffix('Merzouga', 'Maroc')).toBe('Merzouga');
    expect(localizeLocationSuffix('Lisbon, Portugal', 'Maroc')).toBe('Lisbon, Portugal');
    expect(localizeLocationSuffix('Sahara Desert', 'Maroc')).toBe('Sahara Desert');
    expect(localizeLocationSuffix('', 'Maroc')).toBe('');
  });
});
