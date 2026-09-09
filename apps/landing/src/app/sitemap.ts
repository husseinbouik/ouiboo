import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL || 'http://localhost:3004'
  return [{
    url: new URL('/', `${landingUrl}/`).toString(),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1,
  }]
}
