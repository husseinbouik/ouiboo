import type { MetadataRoute } from 'next'
import { absoluteLandingUrl, isLandingIndexable } from '../lib/site'

// #564: URLs come from the resolved public origin in lib/site (the
// traveller resolver's Vercel-host fallback pattern) — a deployed build
// can no longer advertise `http://localhost:3004/`. While the indexing
// gate is closed (closed beta), the sitemap is deliberately empty so it
// cannot contradict robots.ts; flipping NEXT_PUBLIC_LANDING_INDEXABLE
// to 'true' at public launch populates it together with robots.
export default function sitemap(): MetadataRoute.Sitemap {
  if (!isLandingIndexable()) return []
  return [{
    url: absoluteLandingUrl('/'),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1,
  }]
}
