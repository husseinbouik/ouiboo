import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { API_URL } from '@/lib/site'
import { buildTripMetadata } from '@/lib/trip-metadata'

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
      next: { revalidate: 60 },
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

  // #468: shared builder — identical to the page's generateMetadata, so
  // the served OG/Twitter tags never depend on metadata merge order.
  return buildTripMetadata(trip)
}

export default function TripLayout({ children }: TripLayoutProps) {
  return children
}
