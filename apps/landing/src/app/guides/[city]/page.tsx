import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getInitialLanguage } from '@ouiboo/i18n/server'
import {
  GUIDE_CITY_SLUGS,
  VERIFICATION_PATH,
  buildFaqJsonLd,
  buildTouristTripJsonLd,
  guideCity,
  guidesContent,
  type GuideCitySlug,
} from '../../../lib/guides'
import { absoluteLandingUrl } from '../../../lib/site'
import { fetchDestinationInventory } from '../../../lib/inventory'
import { LayerBInventorySection } from '../../../components/LayerBInventory'

/**
 * #683 (Council S6): one template for the three Northern Cluster city
 * guides. Server-rendered from the language maps; INDEXED on purpose
 * (Layer A) while the rest of the landing stays noindexed during the
 * beta. Layer A ship conditions: no trip cards, no prices, no counts,
 * no booking CTAs — homepage showcase + "bookings not yet open" only.
 *
 * #685 Layer B: BELOW the Layer A content, live inventory (trip
 * cards, prices, counts, review aggregates) renders from the
 * destination-inventory API when — and only when — the city has live
 * verified trips; the category×city children are gated by the same
 * payload. Production indexing of Layer B stays behind the legal
 * gate; this build targets staging.
 */

export function generateStaticParams() {
  return GUIDE_CITY_SLUGS.map((city) => ({ city }))
}

function isGuideCity(value: string): value is GuideCitySlug {
  return (GUIDE_CITY_SLUGS as readonly string[]).includes(value)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>
}): Promise<Metadata> {
  const { city } = await params
  if (!isGuideCity(city)) return {}
  const locale = await getInitialLanguage()
  const content = guideCity(locale, city)
  return {
    title: content.title,
    description: content.description,
    alternates: { canonical: absoluteLandingUrl(`/guides/${city}`) },
    // Layer A is indexable BY DESIGN — it must not inherit the beta
    // noindex the root layout metadata applies to the rest of the site.
    robots: { index: true, follow: true },
  }
}

export default async function GuideCityPage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city } = await params
  if (!isGuideCity(city)) notFound()
  const locale = await getInitialLanguage()
  const shared = guidesContent(locale)
  const content = guideCity(locale, city)
  const jsonLd = [buildTouristTripJsonLd(content, city), buildFaqJsonLd(content.faq)]
  // #685 Layer B: live inventory from ONE API query (null when the
  // API is unreachable or the city has no live verified trips — the
  // Layer A guide then stands alone).
  const inventory = await fetchDestinationInventory(city, locale)

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background px-6 py-16 text-foreground sm:py-24">
      {jsonLd.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-orange-700 hover:underline">
          Ouiboo
        </Link>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">{content.title}</h1>
        <p className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
          {shared.bookingsNotOpen}
        </p>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">{content.intro}</p>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">{shared.highlightsTitle}</h2>
          <div className="mt-6 space-y-8">
            {content.highlights.map((highlight) => (
              <div key={highlight.title}>
                <h3 className="text-xl font-bold">{highlight.title}</h3>
                <p className="mt-2 leading-7 text-muted-foreground">{highlight.text}</p>
              </div>
            ))}
          </div>
        </section>

        {content.worldCup && (
          <section className="mt-12 rounded-3xl border border-border bg-card p-7 shadow-sm">
            <h2 className="text-2xl font-bold">{content.worldCup.title}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{content.worldCup.text}</p>
          </section>
        )}

        <section className="mt-12">
          <h2 className="text-2xl font-bold">{shared.faqTitle}</h2>
          <div className="mt-6 space-y-6">
            {content.faq.map((item) => (
              <div key={item.q}>
                <h3 className="font-bold">{item.q}</h3>
                <p className="mt-1 leading-7 text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {inventory ? (
          <LayerBInventorySection locale={locale} city={city} cityName={content.name} inventory={inventory} />
        ) : null}

        <section className="mt-12 rounded-3xl border border-border bg-card p-7 shadow-sm">
          <p className="leading-7 text-muted-foreground">{shared.waitlistNote}</p>
          <Link
            href="/#showcase"
            className="mt-4 inline-block rounded-md bg-deep-blue px-6 py-3 text-base font-semibold text-white shadow-sm"
          >
            {shared.waitlistCta}
          </Link>
          <p className="mt-6">
            <Link href={VERIFICATION_PATH} className="font-semibold text-orange-700 hover:underline">
              {shared.verificationLink}
            </Link>
          </p>
        </section>
      </article>
    </main>
  )
}
