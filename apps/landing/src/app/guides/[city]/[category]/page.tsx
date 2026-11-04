import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getInitialLanguage } from '@ouiboo/i18n/server'
import { GUIDE_CITY_SLUGS, guideCity, type GuideCitySlug } from '../../../../lib/guides'
import {
  fetchDestinationInventory,
  interpolate,
  layerBContent,
} from '../../../../lib/inventory'
import { absoluteLandingUrl } from '../../../../lib/site'
import { LayerBInventorySection } from '../../../../components/LayerBInventory'

/**
 * #685 (Council S6): category×city children of the Layer A guide
 * URLs. A child EXISTS only while the live inventory has at least one
 * verified trip in that cell — the inventory payload's category list
 * is the gate; anything else 404s. Rendered from the same single
 * inventory query as the parent page, so counts reconcile.
 */

export const dynamicParams = true

function isGuideCity(value: string): value is GuideCitySlug {
  return (GUIDE_CITY_SLUGS as readonly string[]).includes(value)
}

async function resolveCell(city: string, category: string) {
  if (!isGuideCity(city)) return null
  const locale = await getInitialLanguage()
  const inventory = await fetchDestinationInventory(city, locale)
  if (!inventory) return null
  const cell = inventory.categories.find(
    (entry) => entry.category.toLowerCase() === category.toLowerCase() && entry.tripCount > 0,
  )
  if (!cell) return null
  const trips = inventory.trips.filter(
    (trip) => trip.category.toLowerCase() === category.toLowerCase(),
  )
  if (trips.length === 0) return null
  return { locale, inventory: { ...inventory, trips, tripCount: trips.length }, cell }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; category: string }>
}): Promise<Metadata> {
  const { city, category } = await params
  const resolved = await resolveCell(city, category)
  if (!resolved || !isGuideCity(city)) return {}
  const content = guideCity(resolved.locale, city)
  const layerB = layerBContent(resolved.locale)
  const categoryName = layerB.categoryNames[resolved.cell.category] ?? resolved.cell.category
  return {
    title: interpolate(layerB.categoryTitle, { category: categoryName, city: content.name }),
    description: content.description,
    alternates: { canonical: absoluteLandingUrl(`/guides/${city}/${category.toLowerCase()}`) },
    robots: { index: true, follow: true },
  }
}

export default async function GuideCategoryPage({
  params,
}: {
  params: Promise<{ city: string; category: string }>
}) {
  const { city, category } = await params
  const resolved = await resolveCell(city, category)
  if (!resolved || !isGuideCity(city)) notFound()
  const content = guideCity(resolved.locale, city)
  const layerB = layerBContent(resolved.locale)
  const categoryName = layerB.categoryNames[resolved.cell.category] ?? resolved.cell.category

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background px-6 py-16 text-foreground sm:py-24">
      <article className="mx-auto max-w-3xl">
        <Link href={`/guides/${city}`} className="text-sm font-semibold text-orange-700 hover:underline">
          {interpolate(layerB.backToCity, { city: content.name })}
        </Link>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">
          {interpolate(layerB.categoryTitle, { category: categoryName, city: content.name })}
        </h1>
        <LayerBInventorySection
          locale={resolved.locale}
          city={city}
          cityName={content.name}
          inventory={resolved.inventory}
        />
      </article>
    </main>
  )
}
