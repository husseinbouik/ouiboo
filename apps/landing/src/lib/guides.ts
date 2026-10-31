import type { SupportedLanguage } from '@ouiboo/i18n/server'
import en from '../../public/locales/en/translation.json'
import fr from '../../public/locales/fr/translation.json'
import ar from '../../public/locales/ar/translation.json'
import { absoluteLandingUrl } from './site'

/**
 * #683 (Council S6): Northern Cluster Layer A — the indexed,
 * non-transactional content layer. Three city guides on ONE template
 * plus the verification explainer, rendered server-side from the
 * existing language maps (public/locales/{fr,ar,en}/translation.json,
 * namespace `guides`). HARD ship conditions, enforced by the census
 * test in this folder: NO trip cards, NO prices, NO counts, NO booking
 * CTAs — homepage showcase + "bookings not yet open" only — and copy audited
 * against #661 (no first/only/biggest claims; dated verification
 * statements only). These routes are deliberately INDEXABLE while the
 * rest of the landing stays behind the beta noindex gate: robots.ts,
 * sitemap.ts and the page metadata carve out exactly these paths.
 */

export const GUIDE_CITY_SLUGS = ['tangier', 'tetouan', 'chefchaouen'] as const
export type GuideCitySlug = (typeof GUIDE_CITY_SLUGS)[number]

export const VERIFICATION_PATH = '/verification'
export const guidePath = (slug: GuideCitySlug): string => `/guides/${slug}`

/** Every route Layer A indexes — sitemap + robots share this list. */
export const GUIDE_PATHS: readonly string[] = [
  ...GUIDE_CITY_SLUGS.map(guidePath),
  VERIFICATION_PATH,
]

export interface GuideFaqItem { q: string; a: string }
export interface GuideHighlight { title: string; text: string }
export interface GuideCity {
  name: string
  title: string
  description: string
  intro: string
  highlights: GuideHighlight[]
  worldCup?: { title: string; text: string }
  faq: GuideFaqItem[]
}
export interface VerificationContent {
  title: string
  description: string
  intro: string
  stepsTitle: string
  steps: GuideHighlight[]
  datedLine: string
  faq: GuideFaqItem[]
}
export interface GuidesContent {
  bookingsNotOpen: string
  waitlistCta: string
  waitlistNote: string
  faqTitle: string
  highlightsTitle: string
  verificationLink: string
  footerGuides: string
  tangier: GuideCity
  tetouan: GuideCity
  chefchaouen: GuideCity
  verification: VerificationContent
}

const GUIDES_BY_LOCALE: Record<SupportedLanguage, GuidesContent> = {
  en: (en as { guides: GuidesContent }).guides,
  fr: (fr as { guides: GuidesContent }).guides,
  ar: (ar as { guides: GuidesContent }).guides,
}

export function guidesContent(locale: SupportedLanguage): GuidesContent {
  return GUIDES_BY_LOCALE[locale]
}

export function guideCity(locale: SupportedLanguage, slug: GuideCitySlug): GuideCity {
  return GUIDES_BY_LOCALE[locale][slug]
}

/** FAQPage schema, derived from the same FAQ the page renders. */
export function buildFaqJsonLd(faq: GuideFaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }
}

/** TouristTrip schema for a guide: the destination as a trip theme —
 * no offers, no prices, no availability (Layer A is non-transactional). */
export function buildTouristTripJsonLd(city: GuideCity, slug: GuideCitySlug) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: city.title,
    description: city.description,
    url: absoluteLandingUrl(guidePath(slug)),
    touristType: 'Sightseeing travellers',
  }
}
