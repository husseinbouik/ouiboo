import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { API_URL, metadataDescription } from '@/lib/site'

type AgencyMetadata = {
  id: string
  companyName: string
  bio?: string | null
  logo?: string | null
}

type AgencyLayoutProps = {
  children: ReactNode
  params: Promise<{ agencyId: string }>
}

async function getAgency(id: string): Promise<AgencyMetadata | null> {
  try {
    const response = await fetch(`${API_URL}/agencies/${encodeURIComponent(id)}/public`, {
      next: { revalidate: 900 },
    })
    if (!response.ok) return null
    return response.json() as Promise<AgencyMetadata>
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: AgencyLayoutProps): Promise<Metadata> {
  const { agencyId } = await params
  const agency = await getAgency(agencyId)

  if (!agency) {
    return {
      title: 'Agency not found',
      robots: { index: false, follow: false },
    }
  }

  const description = metadataDescription(agency.bio || `Browse trips from ${agency.companyName} on Ouiboo.`)
  const canonicalPath = `/agency/${encodeURIComponent(agency.id)}`

  return {
    title: agency.companyName,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'profile',
      title: agency.companyName,
      description,
      url: canonicalPath,
      images: agency.logo ? [{ url: agency.logo, alt: `${agency.companyName} logo` }] : undefined,
    },
    twitter: {
      card: agency.logo ? 'summary' : 'summary_large_image',
      title: agency.companyName,
      description,
      images: agency.logo ? [agency.logo] : undefined,
    },
  }
}

export default function AgencyLayout({ children }: AgencyLayoutProps) {
  return children
}
