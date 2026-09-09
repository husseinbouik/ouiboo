import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { API_URL, metadataDescription } from '@/lib/site'

type TripMetadata = {
  id: string
  title: string
  description?: string | null
  images?: string[]
  startLocation?: string | null
}

type TripLayoutProps = {
  children: ReactNode
  params: Promise<{ id: string }>
}

async function getTrip(id: string): Promise<TripMetadata | null> {
  try {
    const response = await fetch(`${API_URL}/trips/${encodeURIComponent(id)}`, {
      next: { revalidate: 900 },
    })
    if (!response.ok) return null
    return response.json() as Promise<TripMetadata>
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: TripLayoutProps): Promise<Metadata> {
  const { id } = await params
  const trip = await getTrip(id)

  if (!trip) {
    return {
      title: 'Trip not found',
      robots: { index: false, follow: false },
    }
  }

  const description = metadataDescription(trip.description)
  const canonicalPath = `/trip/${encodeURIComponent(trip.id)}`

  return {
    title: trip.title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'website',
      title: trip.title,
      description,
      url: canonicalPath,
      images: trip.images?.filter(Boolean).slice(0, 4).map((url) => ({ url, alt: trip.title })),
    },
    twitter: {
      card: 'summary_large_image',
      title: trip.title,
      description,
      images: trip.images?.filter(Boolean).slice(0, 1),
    },
  }
}

export default function TripLayout({ children }: TripLayoutProps) {
  return children
}
