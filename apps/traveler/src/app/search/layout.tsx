import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Explore trips',
  description: 'Search Ouiboo trips by travel style, date, availability, and budget.',
  alternates: { canonical: '/search' },
  openGraph: {
    title: 'Explore trips',
    description: 'Search Ouiboo trips by travel style, date, availability, and budget.',
    url: '/search',
  },
}

export default function SearchLayout({ children }: { children: ReactNode }) {
  return children
}
