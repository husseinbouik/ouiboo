import type { Metadata } from 'next'
import Link from 'next/link'
import { getInitialLanguage } from '@ouiboo/i18n/server'
import type { SupportedLanguage } from '@ouiboo/i18n/server'
import { GUIDE_CITY_SLUGS, VERIFICATION_PATH, guideCity, guidePath, guidesContent } from '../../lib/guides'
import { absoluteLandingUrl } from '../../lib/site'
import en from '../../../public/locales/en/translation.json'
import fr from '../../../public/locales/fr/translation.json'
import ar from '../../../public/locales/ar/translation.json'

/**
 * #735: the guides index — the target of the homepage's generic
 * "Explore the guides" link. The Honest Window homepage names no city
 * (founder direction: Ouiboo is Morocco-wide, no North/city framing);
 * this directory page is where the individual city guides are listed.
 * Same Layer A discipline as the city pages (#683): no trip cards, no
 * prices, no counts, no booking CTAs.
 */
interface GuidesPageCopy {
  title: string
  intro: string
  readGuide: string
}

const COPY: Record<SupportedLanguage, GuidesPageCopy> = {
  en: (en as { hw: { guidesPage: GuidesPageCopy } }).hw.guidesPage,
  fr: (fr as { hw: { guidesPage: GuidesPageCopy } }).hw.guidesPage,
  ar: (ar as { hw: { guidesPage: GuidesPageCopy } }).hw.guidesPage,
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getInitialLanguage()
  const copy = COPY[locale]
  return {
    title: copy.title,
    description: copy.intro,
    alternates: { canonical: absoluteLandingUrl('/guides') },
    robots: { index: true, follow: true },
  }
}

export default async function GuidesIndexPage() {
  const locale = await getInitialLanguage()
  const copy = COPY[locale]
  const shared = guidesContent(locale)

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background px-6 py-16 text-foreground sm:py-24">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-orange-700 hover:underline">
          Ouiboo
        </Link>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">{copy.title}</h1>
        <p className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
          {shared.bookingsNotOpen}
        </p>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">{copy.intro}</p>

        <section className="mt-12 space-y-6">
          {GUIDE_CITY_SLUGS.map((slug) => {
            const city = guideCity(locale, slug)
            return (
              <div key={slug} className="rounded-3xl border border-border bg-card p-7 shadow-sm">
                <h2 className="text-2xl font-bold">{city.name}</h2>
                <p className="mt-2 leading-7 text-muted-foreground">{city.description}</p>
                <Link
                  href={guidePath(slug)}
                  className="mt-4 inline-block font-semibold text-orange-700 hover:underline"
                >
                  {copy.readGuide} <span aria-hidden="true" className="inline-block rtl:-scale-x-100">→</span>
                </Link>
              </div>
            )
          })}
        </section>

        <p className="mt-12">
          <Link href={VERIFICATION_PATH} className="font-semibold text-orange-700 hover:underline">
            {shared.verificationLink}
          </Link>
        </p>
      </article>
    </main>
  )
}
