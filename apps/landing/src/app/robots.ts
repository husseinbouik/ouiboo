import type { MetadataRoute } from 'next'
import { absoluteLandingUrl, isLandingIndexable } from '../lib/site'
import { GUIDE_PATHS } from '../lib/guides'

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
    // #683 (Council S6 Layer A): carve out exactly the guide +
    // verification routes — they are indexed during the beta while
    // everything else on this host stays disallowed. The sitemap
    // (which lists only those routes in this state) is advertised.
    return {
      rules: [{ userAgent: '*', allow: [...GUIDE_PATHS], disallow: '/' }],
      sitemap: absoluteLandingUrl('/sitemap.xml'),
    }
  }
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: absoluteLandingUrl('/sitemap.xml'),
  }
}
