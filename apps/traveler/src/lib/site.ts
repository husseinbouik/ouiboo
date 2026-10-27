import { isLocalhostUrl } from '@ouiboo/utils'

export const SITE_NAME = 'Ouiboo'
export const SITE_DESCRIPTION =
  'Discover and book memorable trips from local travel experts, with clear details in one place.'

const LOCAL_DEV_TRAVELER_URL = 'http://localhost:3001'

/**
 * The traveller app's public origin: the metadata base for canonical/OG
 * URLs, the sitemap URLs and the #468 share-link base.
 *
 * NEXT_PUBLIC_TRAVELER_URL is the configured source and is set on every
 * deployed project. The loopback default exists for local development
 * only: in a production build whose configured value is missing or
 * loopback, fall back to this deployment's own Vercel host rather than
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
