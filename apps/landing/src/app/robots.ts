import type { MetadataRoute } from 'next'

const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL || 'http://localhost:3004'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: new URL('/sitemap.xml', `${landingUrl}/`).toString(),
    host: landingUrl,
  }
}
