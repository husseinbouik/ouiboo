import type { MetadataRoute } from 'next'
import { absoluteLandingUrl, isLandingIndexable } from '../lib/site'

// Council P0-06 + #564: the landing stays noindexed until the liquidity
// gate (P0-17) passes. That decision is now a single switch —
// isLandingIndexable() in lib/site — shared with sitemap.ts and the
// page metadata, so robots, sitemap and metadata can never contradict
// each other again (the served sitemap previously advertised a
// localhost URL while robots disallowed everything). At public launch,
// setting NEXT_PUBLIC_LANDING_INDEXABLE='true' allows crawling and
// advertises the sitemap on the resolved public origin.
export default function robots(): MetadataRoute.Robots {
  if (!isLandingIndexable()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: absoluteLandingUrl('/sitemap.xml'),
  }
}
