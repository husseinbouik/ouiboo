import Link from 'next/link'
import type { DestinationInventory } from '@ouiboo/types'
import type { SupportedLanguage } from '@ouiboo/i18n/server'
import type { GuideCitySlug } from '../lib/guides'
import {
  categoryPath,
  interpolate,
  layerBContent,
  travelerTripUrl,
  tripFromPrice,
} from '../lib/inventory'

/**
 * #685 Layer B: live-inventory section rendered from the destination
 * inventory payload — trip cards with real prices, counts that ARE
 * the payload's counts, the review aggregate (rendered only when the
 * API publishes one — it withholds averages below the #681 minimum),
 * and links to the inventory-gated category×city children.
 */
export function LayerBInventorySection({
  locale,
  city,
  cityName,
  inventory,
}: {
  locale: SupportedLanguage
  city: GuideCitySlug
  cityName: string
  inventory: DestinationInventory
}) {
  const layerB = layerBContent(locale)
  if (inventory.tripCount === 0 || inventory.trips.length === 0) return null

  return (
    <section className="mt-12" data-testid="layer-b-inventory">
      <h2 className="text-2xl font-bold">
        {interpolate(layerB.liveInventoryTitle, { city: cityName })}
      </h2>
      <p className="mt-3 text-muted-foreground">
        {interpolate(layerB.tripCount, { count: inventory.tripCount })}
        {' · '}
        {interpolate(layerB.agencyCount, { count: inventory.agencyCount })}
        {inventory.averageRating !== null && (
          <>
            {' · '}
            {interpolate(layerB.reviewAggregate, {
              rating: inventory.averageRating,
              count: inventory.reviewCount,
            })}
          </>
        )}
      </p>

      {inventory.categories.length > 0 && (
        <nav className="mt-5 flex flex-wrap gap-2" aria-label={layerB.liveInventoryTitle}>
          {inventory.categories
            .filter((cell) => cell.tripCount > 0)
            .map((cell) => (
              <Link
                key={cell.category}
                href={categoryPath(city, cell.category)}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:underline"
              >
                {layerB.categoryNames[cell.category] ?? cell.category} ({cell.tripCount})
              </Link>
            ))}
        </nav>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {inventory.trips.map((trip) => {
          const fromPrice = tripFromPrice(trip)
          return (
            <article key={trip.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              {trip.images?.[0] ? (
                // Inventory images are remote media URLs; a plain img
                // keeps this server page free of image-domain config.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={trip.images[0]} alt="" className="h-40 w-full object-cover" loading="lazy" />
              ) : null}
              <div className="p-5">
                <h3 className="font-bold leading-snug">{trip.title}</h3>
                {trip.agency?.companyName ? (
                  <p className="mt-1 text-sm text-muted-foreground">{trip.agency.companyName}</p>
                ) : null}
                {trip.cancellationSummary?.freeCancellation &&
                trip.cancellationSummary.freeCancellationDays !== null &&
                trip.cancellationSummary.freeCancellationDays !== undefined ? (
                  <p className="mt-2 text-sm font-semibold text-emerald-700">
                    {interpolate(layerB.freeCancellation, {
                      days: trip.cancellationSummary.freeCancellationDays,
                    })}
                  </p>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-3">
                  {fromPrice ? (
                    <p className="text-sm font-bold">
                      {layerB.fromPrice} {fromPrice}
                    </p>
                  ) : (
                    <span />
                  )}
                  <a
                    href={travelerTripUrl(trip.id)}
                    className="text-sm font-semibold text-orange-700 hover:underline"
                  >
                    {layerB.viewTrip}
                  </a>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
