import type { SupportedLanguage } from '@ouiboo/i18n/server'
import en from '../../public/locales/en/translation.json'
import fr from '../../public/locales/fr/translation.json'
import ar from '../../public/locales/ar/translation.json'
import { interpolate, layerBContent } from './inventory'

/**
 * #771 (founder flag): the homepage showcase is data-driven — trips
 * from DIFFERENT agencies, not one hard-coded agency. Cards are built
 * from ONE public-catalogue query (GET /trips), quality-filtered, and
 * each card's dated check line comes from that agency's own public
 * verification record (#688). Selection is capped at one trip per
 * agency so the rail can never collapse back to a single seller. When
 * the API yields nothing usable the caller falls back to the static
 * cards in LandingPage — the page never breaks and never invents an
 * agency, a trip or a check date.
 */

export interface ShowcaseCardContent {
  title: string
  city: string
  tags: string[]
}

export interface ShowcaseCardData {
  tripId: string
  img: string
  agencyName: string
  initials: string
  /** ISO date the agency's documents were checked (its own record). */
  checkedOn: string
  /** ISO date the agency's RC insurance runs to (its own record). */
  insuranceExpiry: string
  content: Record<SupportedLanguage, ShowcaseCardContent>
}

/** The subset of the public trip payload the showcase reads. */
export interface PublicShowcaseTrip {
  id: string
  agencyId: string
  status?: string
  createdAt?: string
  startLocation?: string | null
  category?: string | null
  durationDays?: number | null
  durationNights?: number | null
  images?: unknown
  translations?: Record<string, { title?: unknown } | undefined> | null
  agency?: { companyName?: string; verificationStatus?: string } | null
}

const LOCALES: SupportedLanguage[] = ['fr', 'ar', 'en']

interface ShowcaseStrings {
  durationDay: string
  durationDays: string
  durationNight: string
  durationNights: string
}

const SHOWCASE_STRINGS: Record<SupportedLanguage, ShowcaseStrings> = {
  en: (en as { hw: { showcase: ShowcaseStrings } }).hw.showcase,
  fr: (fr as { hw: { showcase: ShowcaseStrings } }).hw.showcase,
  ar: (ar as { hw: { showcase: ShowcaseStrings } }).hw.showcase,
}

function realImages(trip: PublicShowcaseTrip): string[] {
  if (!Array.isArray(trip.images)) return []
  return trip.images.filter(
    (u): u is string =>
      typeof u === 'string' && u.startsWith('http') && !u.includes('example.com'),
  )
}

/**
 * A trip may appear in the showcase only if a visitor could act on
 * every claim the card makes: the trip is live, its agency is
 * verified, the card copy exists in all three locales, and the photo
 * is a real image (never a placeholder/witness URL).
 */
export function isShowcaseQuality(trip: PublicShowcaseTrip): boolean {
  if (!trip || trip.status !== 'ACTIVE') return false
  if (trip.agency?.verificationStatus !== 'VERIFIED') return false
  const translations = trip.translations || {}
  for (const locale of LOCALES) {
    const title = translations[locale]?.title
    if (typeof title !== 'string' || !title.trim()) return false
  }
  return realImages(trip).length >= 3
}

/**
 * Up to `limit` trips, at most one per agency, oldest first (stable
 * against the catalogue's own ordering). Quality gates run before the
 * per-agency pick, so a junk trip never claims its agency's slot.
 */
export function selectShowcaseTrips(
  trips: PublicShowcaseTrip[],
  limit = 3,
): PublicShowcaseTrip[] {
  const sorted = [...trips].sort((a, b) =>
    String(a.createdAt || '').localeCompare(String(b.createdAt || '')),
  )
  const picked: PublicShowcaseTrip[] = []
  const seenAgencies = new Set<string>()
  for (const trip of sorted) {
    if (picked.length >= limit) break
    if (!isShowcaseQuality(trip)) continue
    if (seenAgencies.has(trip.agencyId)) continue
    seenAgencies.add(trip.agencyId)
    picked.push(trip)
  }
  return picked
}

export function agencyInitials(companyName: string): string {
  const words = companyName.replace(/[^A-Za-zÀ-ÿ ]/g, ' ').split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || '··'
}

function durationTag(locale: SupportedLanguage, days?: number | null, nights?: number | null): string | null {
  const s = SHOWCASE_STRINGS[locale]
  const parts: string[] = []
  if (days) parts.push(interpolate(days === 1 ? s.durationDay : s.durationDays, { count: days }))
  if (nights) parts.push(interpolate(nights === 1 ? s.durationNight : s.durationNights, { count: nights }))
  return parts.length ? parts.join(' · ') : null
}

function cardContent(trip: PublicShowcaseTrip): Record<SupportedLanguage, ShowcaseCardContent> {
  const city = trip.startLocation || ''
  const out = {} as Record<SupportedLanguage, ShowcaseCardContent>
  for (const locale of LOCALES) {
    const tags: string[] = []
    const duration = durationTag(locale, trip.durationDays, trip.durationNights)
    if (duration) tags.push(duration)
    const categoryName = trip.category
      ? layerBContent(locale).categoryNames[trip.category] || trip.category
      : null
    if (categoryName) tags.push(categoryName)
    out[locale] = {
      title: String(trip.translations?.[locale]?.title || ''),
      city,
      tags,
    }
  }
  return out
}

interface VerificationRecord {
  status?: string
  checkedOn?: string
  insuranceExpiry?: string
}

async function fetchVerificationRecord(
  apiUrl: string,
  agencyId: string,
): Promise<VerificationRecord | null> {
  try {
    const res = await fetch(`${apiUrl}/agencies/${agencyId}/public`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { verificationRecord?: VerificationRecord }
    const record = data?.verificationRecord
    if (!record || record.status !== 'VERIFIED' || !record.checkedOn || !record.insuranceExpiry) {
      return null
    }
    return record
  } catch {
    return null
  }
}

/**
 * Build the showcase cards from the live catalogue. Returns null when
 * nothing usable exists (API down, no verified multi-agency supply) —
 * the caller then renders the static fallback cards.
 */
export async function fetchShowcaseCards(): Promise<ShowcaseCardData[] | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) return null
  try {
    const res = await fetch(`${apiUrl}/trips?limit=50`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { data?: PublicShowcaseTrip[] }
    const trips = Array.isArray(data?.data) ? data.data : []
    const selected = selectShowcaseTrips(trips)
    if (!selected.length) return null
    const cards: ShowcaseCardData[] = []
    for (const trip of selected) {
      const record = await fetchVerificationRecord(apiUrl, trip.agencyId)
      // No record, no card: the check line must be the agency's own
      // true dates, never a borrowed or invented line.
      if (!record) continue
      cards.push({
        tripId: trip.id,
        img: realImages(trip)[0],
        agencyName: trip.agency?.companyName || '',
        initials: agencyInitials(trip.agency?.companyName || ''),
        checkedOn: String(record.checkedOn),
        insuranceExpiry: String(record.insuranceExpiry),
        content: cardContent(trip),
      })
    }
    return cards.length ? cards : null
  } catch {
    return null
  }
}
