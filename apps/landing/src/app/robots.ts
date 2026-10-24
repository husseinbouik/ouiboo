import type { MetadataRoute } from 'next'

// Council P0-06: the landing stays noindexed until the liquidity gate
// (P0-17) passes; only then may indexing be re-enabled.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', disallow: '/' }] }
}
