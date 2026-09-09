import type { MetadataRoute } from 'next'
import { absoluteTravelerUrl, TRAVELER_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: absoluteTravelerUrl('/sitemap.xml'),
    host: TRAVELER_URL,
  }
}
