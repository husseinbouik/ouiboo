export const SITE_NAME = 'Ouiboo'
export const SITE_DESCRIPTION =
  'Discover and book memorable trips from local travel experts, with clear details and secure booking in one place.'

export const TRAVELER_URL =
  process.env.NEXT_PUBLIC_TRAVELER_URL || 'http://localhost:3001'

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
