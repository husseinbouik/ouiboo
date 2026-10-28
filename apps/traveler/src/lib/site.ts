import { isLocalhostUrl } from '@ouiboo/utils'
import type { SupportedLanguage } from '@ouiboo/i18n/server'

export const SITE_NAME = 'Ouiboo'
export const SITE_DESCRIPTION =
  'Discover and book memorable trips from local travel experts, with clear details in one place.'

/**
 * Canonical brand copy (#563 traveller remainder, mirroring the landing
 * alignment in PR #590). ONE tagline across traveller OG, landing OG and
 * email: the email layout's taglines (en "Travel made personal",
 * fr "Le voyage rendu personnel", ar "سفر مصمم على مقاسك"). The root
 * layout's generateMetadata reads title/description/og:locale from here
 * for the visitor's active locale instead of hard-coding English.
 */
export interface SiteCopy {
  tagline: string
  title: string
  description: string
  ogLocale: string
}

export const SITE_COPY: Record<SupportedLanguage, SiteCopy> = {
  en: {
    tagline: 'Travel made personal',
    title: 'Ouiboo — Travel made personal',
    description: SITE_DESCRIPTION,
    ogLocale: 'en_US',
  },
  fr: {
    tagline: 'Le voyage rendu personnel',
    title: 'Ouiboo — Le voyage rendu personnel',
    description:
      "Découvrez et réservez des voyages mémorables auprès d'experts locaux, avec des détails clairs au même endroit.",
    ogLocale: 'fr_FR',
  },
  ar: {
    tagline: 'سفر مصمم على مقاسك',
    title: 'Ouiboo — سفر مصمم على مقاسك',
    description:
      'اكتشف واحجز رحلات لا تُنسى من خبراء سفر محليين، بتفاصيل واضحة في مكان واحد.',
    ogLocale: 'ar_MA',
  },
}

export const OG_LOCALES = Object.values(SITE_COPY).map((copy) => copy.ogLocale)

const LOCAL_DEV_TRAVELER_URL = 'http://localhost:3001'

/**
 * Canonical production origin, used only when a production build has
 * neither a configured NEXT_PUBLIC_TRAVELER_URL nor a Vercel host to
 * derive one from (e.g. the CI e2e build, which sets neither). It is
 * the same canonical domain the smoke suite and the API's
 * TRAVELER_APP_URL default already use. A production build must NEVER
 * fall through to the loopback default: Next resolves the page's
 * relative canonical/OG URLs against metadataBase, so a localhost
 * TRAVELER_URL bakes http://localhost:3001 into the canonical link,
 * og:url, og:image and twitter:image of every page — exactly what the
 * production smoke suite caught (href="http://localhost/...).
 */
const PRODUCTION_TRAVELER_URL = 'https://ouiboo-traveler.vercel.app'

/**
 * The traveller app's public origin: the metadata base for canonical/OG
 * URLs, the sitemap URLs and the #468 share-link base.
 *
 * NEXT_PUBLIC_TRAVELER_URL is the configured source and is set on every
 * deployed project. The loopback default exists for local development
 * only: in a production build whose configured value is missing or
 * loopback, fall back to this deployment's own Vercel host, and then
 * to the canonical production origin, rather than
 * baking localhost into canonical URLs, the sitemap and share links
 * (founder report, 2026-10-27 — staging shared localhost links because
 * the variable was missing on the staging traveller project).
 */
function resolveTravelerUrl(): string {
  const configured = process.env.NEXT_PUBLIC_TRAVELER_URL?.trim()
  if (configured && !isLocalhostUrl(configured)) return configured
  if (process.env.NODE_ENV === 'production') {
    const vercelHost =
      process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
    if (vercelHost) return `https://${vercelHost}`
    return PRODUCTION_TRAVELER_URL
  }
  return configured || LOCAL_DEV_TRAVELER_URL
}

export const TRAVELER_URL = resolveTravelerUrl()

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

export function absoluteTravelerUrl(path: string): string {
  return new URL(path, `${TRAVELER_URL}/`).toString()
}

export function metadataDescription(value: string | null | undefined): string {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  if (!normalized) return SITE_DESCRIPTION
  return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized
}
