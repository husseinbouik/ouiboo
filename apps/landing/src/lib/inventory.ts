import type { DestinationInventory } from '@ouiboo/types'
import type { SupportedLanguage } from '@ouiboo/i18n/server'
import en from '../../public/locales/en/translation.json'
import fr from '../../public/locales/fr/translation.json'
import ar from '../../public/locales/ar/translation.json'
import type { GuideCitySlug } from './guides'

/**
 * #685 (Council S6): Layer B — LIVE inventory on the Layer A city
 * URLs. Everything rendered from this module comes from ONE API query
 * (GET /trips/destinations/:slug), so the trip cards, the counts and
 * the category children reconcile by construction — nothing here is
 * hardcoded, and when the API is unreachable or the city has no live
 * verified inventory the section simply does not render (the Layer A
 * guide stands alone).
 */

export interface LayerBContent {
  liveInventoryTitle: string
  tripCount: string
  agencyCount: string
  reviewAggregate: string
  reviewsCount: string
  viewTrip: string
  fromPrice: string
  categoryTitle: string
  backToCity: string
  categoryNames: Record<string, string>
  freeCancellation: string
}

const LAYER_B_BY_LOCALE: Record<SupportedLanguage, LayerBContent> = {
  en: (en as { guides: { layerB: LayerBContent } }).guides.layerB,
  fr: (fr as { guides: { layerB: LayerBContent } }).guides.layerB,
  ar: (ar as { guides: { layerB: LayerBContent } }).guides.layerB,
}

export function layerBContent(locale: SupportedLanguage): LayerBContent {
  return LAYER_B_BY_LOCALE[locale]
}

/** Minimal `{{name}}` interpolation — the landing renders locale JSON
 * directly (no i18next runtime on these server pages). */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    values[key] === undefined ? '' : String(values[key]),
  )
}

const INVENTORY_REVALIDATE_SECONDS = 300

export async function fetchDestinationInventory(
  slug: GuideCitySlug,
  locale: SupportedLanguage,
): Promise<DestinationInventory | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) return null
  try {
    const res = await fetch(`${apiUrl}/trips/destinations/${slug}?locale=${locale}`, {
      next: { revalidate: INVENTORY_REVALIDATE_SECONDS },
    })
    if (!res.ok) return null
    const data = (await res.json()) as DestinationInventory
    if (!data || typeof data.tripCount !== 'number' || !Array.isArray(data.trips)) return null
    return data
  } catch {
    return null
  }
}

/** The traveller app origin for trip links (same env the landing
 * page component already requires in production builds). */
export function travelerTripUrl(tripId: string): string {
  const base = process.env.NEXT_PUBLIC_TRAVELER_URL || 'http://localhost:3001'
  return `${base.replace(/\/$/, '')}/trip/${tripId}`
}

/** Display "from" price for an inventory trip: the stored starting
 * price, else the cheapest upcoming session price. */
export function tripFromPrice(trip: DestinationInventory['trips'][number]): string | null {
  const raw = trip.startingPrice ?? trip.sessions?.[0]?.price ?? null
  if (raw === null || raw === undefined || raw === '') return null
  const amount = Number(raw)
  if (!Number.isFinite(amount)) return null
  return `${amount} ${trip.currency}`
}

export function categoryPath(city: GuideCitySlug, category: string): string {
  return `/guides/${city}/${category.toLowerCase()}`
}

/** Category cells with live inventory — THE gate for category×city
 * children (pages, sitemap entries and robots allowances). */
export function liveCategoryPaths(
  slug: GuideCitySlug,
  inventory: DestinationInventory | null,
): string[] {
  if (!inventory) return []
  return inventory.categories
    .filter((cell) => cell.tripCount > 0)
    .map((cell) => categoryPath(slug, cell.category))
}
