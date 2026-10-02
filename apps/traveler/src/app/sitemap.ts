import type { MetadataRoute } from 'next'
import { API_URL, absoluteTravelerUrl } from '@/lib/site'

type SitemapTrip = {
  id: string
  updatedAt?: string
}

type TripsPage = {
  data?: SitemapTrip[]
  pagination?: { totalPages?: number }
}

async function fetchTripsPage(page: number): Promise<TripsPage> {
  const response = await fetch(
    `${API_URL}/trips?status=ACTIVE&page=${page}&limit=50&sortBy=updatedAt&sortOrder=desc`,
    { next: { revalidate: 3600 } },
  )

  if (!response.ok) throw new Error(`Trips sitemap request failed with ${response.status}`)
  return response.json() as Promise<TripsPage>
}

async function getPublishedTrips(): Promise<SitemapTrip[]> {
  try {
    const firstPage = await fetchTripsPage(1)
    const totalPages = Math.min(Math.max(firstPage.pagination?.totalPages ?? 1, 1), 1000)
    const remainingPages = totalPages > 1
      ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => fetchTripsPage(index + 2)))
      : []

    return [firstPage, ...remainingPages].flatMap((page) => page.data ?? [])
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteTravelerUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteTravelerUrl('/search'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteTravelerUrl('/trips/featured'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: absoluteTravelerUrl('/privacy'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteTravelerUrl('/terms'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const trips = await getPublishedTrips()
  return [
    ...staticEntries,
    ...trips.map((trip) => ({
      url: absoluteTravelerUrl(`/trip/${encodeURIComponent(trip.id)}`),
      lastModified: trip.updatedAt ? new Date(trip.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
