import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { API_URL } from '@/lib/site'
import { buildTripMetadata } from '@/lib/trip-metadata'
import { getInitialLanguage, type SupportedLanguage } from '@ouiboo/i18n/server'

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

async function getTrip(id: string, locale?: SupportedLanguage): Promise<TripMetadata | null> {
  try {
    const query = locale ? `?locale=${encodeURIComponent(locale)}` : ''
    const response = await fetch(`${API_URL}/trips/${encodeURIComponent(id)}${query}`, {
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
  const locale = await getInitialLanguage()
  const trip = await getTrip(id, locale)

  // #468: shared builder — identical to the page's generateMetadata, so
  // the served OG/Twitter tags never depend on metadata merge order.
  // #563 rework: pass the locale so og:locale/alternateLocale are set.
  return buildTripMetadata(trip, { locale })
}

export default function TripLayout({ children }: TripLayoutProps) {
  return children
}
