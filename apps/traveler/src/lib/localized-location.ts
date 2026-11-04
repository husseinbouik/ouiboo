/**
 * #745 (remainder): card location strings are stored single-language
 * ("Merzouga, Morocco" written once by the agency), so the same string
 * rendered identically in EN, FR and AR. The API now resolves a fully
 * translated `startLocation` when the trip's translations map carries
 * one (#745 API side); for the strings that remain single-language,
 * the country SUFFIX still localizes: a trailing country name in any
 * known variant is swapped for the UI locale's name for that country.
 *
 * Only Morocco is wired today — it is the launch market and the only
 * country whose name variants the catalogue actually carries. The
 * shape is data, not code: add a country by adding its variants and
 * its locale key.
 */
export const MOROCCO_NAME_VARIANTS: readonly string[] = ['Morocco', 'Maroc', 'المغرب'];

/**
 * Replace a trailing ", <country>" suffix (Latin or Arabic comma)
 * with `localizedCountry` when the suffix is one of `variants`
 * (case-insensitive for Latin scripts). A location that IS just the
 * country name localizes whole. Anything else — no suffix, an unknown
 * country, a region name — passes through untouched: a partial
 * translation beats an invented one.
 */
export function localizeLocationSuffix(
  location: string,
  localizedCountry: string,
  variants: readonly string[] = MOROCCO_NAME_VARIANTS,
): string {
  const trimmed = location.trim();
  if (!trimmed) return location;
  const isVariant = (value: string) =>
    variants.some((variant) => variant.toLocaleLowerCase() === value.toLocaleLowerCase());
  if (isVariant(trimmed)) return localizedCountry;
  const match = /^(.*?)(,\s*|،\s*)([^,،]+)$/.exec(trimmed);
  if (!match) return location;
  const [, head, separator, countryPart] = match;
  const country = countryPart.trim();
  if (!isVariant(country)) return location;
  return `${head}${separator}${localizedCountry}`;
}
