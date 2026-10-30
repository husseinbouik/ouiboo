import type { Metadata } from 'next'
import Link from 'next/link'
import { getInitialLanguage } from '@ouiboo/i18n/server'
import { buildFaqJsonLd, guidesContent } from '../../lib/guides'
import { absoluteLandingUrl } from '../../lib/site'

/**
 * #683 (Council S6): the verification explainer — what the agency
 * verification gate checks (licence, RC insurance, seller identity,
 * enforced expiry), stated factually and dated, with the honest limit
 * up front: verification is not a guarantee. Indexed as part of
 * Layer A; no booking CTAs — waitlist only.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getInitialLanguage()
  const content = guidesContent(locale).verification
  return {
    title: content.title,
    description: content.description,
    alternates: { canonical: absoluteLandingUrl('/verification') },
    robots: { index: true, follow: true },
  }
}

export default async function VerificationPage() {
  const locale = await getInitialLanguage()
  const shared = guidesContent(locale)
  const content = shared.verification
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

        <section className="mt-12">
          <h2 className="text-2xl font-bold">{content.stepsTitle}</h2>
          <div className="mt-6 space-y-8">
            {content.steps.map((step) => (
              <div key={step.title}>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="mt-2 leading-7 text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-10 rounded-2xl border border-border bg-muted/30 p-5 text-sm leading-6 text-muted-foreground">
          {content.datedLine}
        </p>

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
            href="/#waitlist"
            className="mt-4 inline-block rounded-md bg-deep-blue px-6 py-3 text-base font-semibold text-white shadow-sm"
          >
            {shared.waitlistCta}
          </Link>
        </section>
      </article>
    </main>
  )
}
