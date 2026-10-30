import type { MetadataRoute } from 'next'
import { absoluteLandingUrl, isLandingIndexable } from '../lib/site'
import { GUIDE_PATHS } from '../lib/guides'

// #564: URLs come from the resolved public origin in lib/site (the
// traveller resolver's Vercel-host fallback pattern) — a deployed build
// can no longer advertise `http://localhost:3004/`. While the indexing
// gate is closed (closed beta), the sitemap is deliberately empty so it
// cannot contradict robots.ts; flipping NEXT_PUBLIC_LANDING_INDEXABLE
// to 'true' at public launch populates it together with robots.
export default function sitemap(): MetadataRoute.Sitemap {
  // #683 (Council S6 Layer A): the guide + verification routes are
  // indexable BY DESIGN during the beta, so they are listed even while
  // the global gate keeps the rest of the landing out of the sitemap.
  const guideEntries: MetadataRoute.Sitemap = GUIDE_PATHS.map((path) => ({
    url: absoluteLandingUrl(path),
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))
  if (!isLandingIndexable()) return guideEntries
  return [{
    url: absoluteLandingUrl('/'),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1,
  }, ...guideEntries]
}
