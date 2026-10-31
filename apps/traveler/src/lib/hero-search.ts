import { BETA_DESTINATIONS } from "@ouiboo/types";

/**
 * #723: homepage hero search — destination resolution + query building.
 *
 * The hero's destination field is free text with suggestions drawn from
 * the SAME beta destination taxonomy the search facets use (#675,
 * BETA_DESTINATIONS). When the typed value names one of those
 * destinations — by slug, by any configured alias (EN/FR/AR spellings),
 * or by its localised display name in the active UI language — the
 * search must carry the facet param the search page already consumes
 * (`destination=<slug>`), not a free-text query. Anything else falls
 * back to the search page's free-text param (`q`), exactly as the
 * search page's own text box behaves.
 *
 * Dates travel in the canonical params the search page parses
 * (`dateFrom` / `dateTo`, see SearchClient.buildSearchParams) — the
 * legacy single `date` alias is not emitted.
 */

/** Case- and diacritic-insensitive comparison key (Arabic is unaffected
 * by NFD decomposition and compares on its exact script form). */
export function normalizeDestinationText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Resolve hero destination text to a BETA_DESTINATIONS slug, or '' when
 * the text does not name a configured destination. Exact matches win;
 * a unique prefix match (e.g. "chef") also resolves, so a traveller who
 * stops typing early still lands on the facet.
 */
export function resolveDestinationSlug(
  input: string,
  localizedNames: Record<string, string> = {},
): string {
  const needle = normalizeDestinationText(input);
  if (!needle) return "";
  const candidates = BETA_DESTINATIONS.map((destination) => ({
    slug: destination.slug as string,
    names: [destination.slug, ...destination.aliases, localizedNames[destination.slug] ?? ""]
      .map(normalizeDestinationText)
      .filter(Boolean),
  }));
  for (const candidate of candidates) {
    if (candidate.names.includes(needle)) return candidate.slug;
  }
  const prefixMatches = candidates.filter((candidate) =>
    candidate.names.some((name) => name.startsWith(needle)),
  );
  return prefixMatches.length === 1 ? prefixMatches[0].slug : "";
}

export interface HeroSearchValues {
  query: string;
  dateFrom: string;
  dateTo: string;
}

/** Build the /search query string for the hero values (canonical param
 * names only — the exact contract SearchClient parses). */
export function buildHeroSearchParams(
  values: HeroSearchValues,
  localizedNames: Record<string, string> = {},
): URLSearchParams {
  const params = new URLSearchParams();
  const query = values.query.trim();
  if (query) {
    const destination = resolveDestinationSlug(query, localizedNames);
    if (destination) {
      params.set("destination", destination);
    } else {
      params.set("q", query);
    }
  }
  if (values.dateFrom) params.set("dateFrom", values.dateFrom);
  if (values.dateTo) params.set("dateTo", values.dateTo);
  return params;
}

/** A range is invalid when both dates are present and end < start.
 * ISO date strings (yyyy-mm-dd from <input type="date">) compare
 * lexicographically, which is also chronological order. */
export function isInvalidDateRange(dateFrom: string, dateTo: string): boolean {
  return Boolean(dateFrom && dateTo && dateTo < dateFrom);
}
