import type { Metadata } from 'next'
import Link from 'next/link'
import { getInitialLanguage } from '@ouiboo/i18n/server'
import {
  ORIGIN_SPAIN_TANGIER_PATH,
  VERIFICATION_PATH,
  buildFaqJsonLd,
  guidePath,
  guidesContent,
  type GuideLink,
} from '../../../lib/guides'
import { absoluteLandingUrl } from '../../../lib/site'

/**
 * #779 (Council S6 Tier 3): the Spain → Tangier origin-market page —
 * ONE origin page in the Layer A pattern (#683), registered in
 * GUIDE_PATHS so sitemap + robots treat it exactly like the city
 * guides. Non-transactional by construction: NO trip cards, NO
 * prices, NO counts, NO booking CTAs, and NO Layer B inventory (an
 * origin page is not a destination cell). Volatile facts (ferry
 * schedules, fares, crossing times) are never stated — the copy
 * describes the routes and links OUT to the operators and official
 * port/entry sources. Entry wording is dated general information,
 * never legal advice and never a guarantee of admission.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getInitialLanguage()
  const content = guidesContent(locale).spainTangier
  return {
    title: content.title,
    description: content.description,
    alternates: { canonical: absoluteLandingUrl(ORIGIN_SPAIN_TANGIER_PATH) },
    // Layer A is indexable BY DESIGN — same carve-out as the city guides.
    robots: { index: true, follow: true },
  }
}

function GuideLinks({ links }: { links?: GuideLink[] }) {
  if (!links?.length) return null
  return (
    <ul className="mt-4 space-y-2">
      {links.map((link) => {
        const external = link.href.startsWith('http')
        return (
          <li key={link.href}>
            {external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-orange-700 hover:underline"
              >
                {link.label} <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <Link href={link.href} className="font-semibold text-orange-700 hover:underline">
                {link.label} <span aria-hidden="true" className="inline-block rtl:-scale-x-100">→</span>
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default async function SpainTangierOriginPage() {
  const locale = await getInitialLanguage()
  const shared = guidesContent(locale)
  const content = shared.spainTangier
  const jsonLd = buildFaqJsonLd(content.faq)

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background px-6 py-16 text-foreground sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-orange-700 hover:underline">
          Ouiboo
        </Link>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">{content.title}</h1>
        <p className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
          {shared.bookingsNotOpen}
        </p>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">{content.intro}</p>

        {content.sections.map((section) => (
          <section key={section.title} className="mt-12">
            <h2 className="text-2xl font-bold">{section.title}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{section.text}</p>
            <GuideLinks links={section.links} />
          </section>
        ))}

        <section className="mt-12">
          <h2 className="text-2xl font-bold">{content.entry.title}</h2>
          <p className="mt-3 leading-7 text-muted-foreground">{content.entry.text}</p>
          <GuideLinks links={content.entry.links} />
          <p className="mt-6 rounded-2xl border border-border bg-muted/30 p-5 text-sm leading-6 text-muted-foreground">
            {content.entry.datedLine}
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">{content.cluster.title}</h2>
          <p className="mt-3 leading-7 text-muted-foreground">{content.cluster.text}</p>
          <GuideLinks links={content.cluster.links} />
          <p className="mt-6">
            <Link href={guidePath('tangier')} className="font-semibold text-orange-700 hover:underline">
              {content.tangierGuideLink} <span aria-hidden="true" className="inline-block rtl:-scale-x-100">→</span>
            </Link>
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">{content.how.title}</h2>
          <p className="mt-3 leading-7 text-muted-foreground">{content.how.text}</p>
          <p className="mt-4">
            <Link href={VERIFICATION_PATH} className="font-semibold text-orange-700 hover:underline">
              {shared.verificationLink}
            </Link>
          </p>
        </section>

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

        <section className="mt-12 rounded-3xl border border-border bg-card p-7 shadow-sm">
          <p className="leading-7 text-muted-foreground">{shared.waitlistNote}</p>
          <Link
            href="/#showcase"
            className="mt-4 inline-block rounded-md bg-deep-blue px-6 py-3 text-base font-semibold text-white shadow-sm"
          >
            {shared.waitlistCta}
          </Link>
        </section>
      </article>
    </main>
  )
}
