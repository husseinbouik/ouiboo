import type { Metadata } from 'next'
import type { SupportedLanguage } from '@ouiboo/i18n/server'
import {
  AGENCES_COPY,
  LANDING_URL,
  OG_LOCALES,
  SITE_COPY,
  SITE_NAME,
  isLandingIndexable,
  landingOgImageUrl,
  localizedAgencesUrl,
  localizedLandingUrl,
} from './site'

/**
 * Locale-driven landing metadata (#563 + #564). Title, description,
 * `og:locale` (+ alternates), Twitter copy and the OG image all come
 * from the caller's locale — resolved server-side from the
 * cookie/header/Accept-Language chain in `getInitialLanguage` — and the
 * canonical/OG URLs carry `?lang=` so a shared link keeps the locale
 * its preview was rendered in. `metadataBase` is the resolved public
 * origin (never a baked-in localhost in a deployed build, #564), and
 * the robots directive follows the same single indexing gate as
 * `robots.ts`/`sitemap.ts`.
 */
export function buildLandingMetadata(locale: SupportedLanguage): Metadata {
  const copy = SITE_COPY[locale]
  const indexable = isLandingIndexable()
  return {
    metadataBase: new URL(LANDING_URL),
    applicationName: SITE_NAME,
    title: {
      default: copy.title,
      template: `%s | ${SITE_NAME}`,
    },
    description: copy.description,
    keywords: ['Ouiboo', 'travel marketplace', 'travel experiences', 'travel agencies', 'local travel experts'],
    alternates: {
      canonical: localizedLandingUrl(locale),
      languages: {
        en: localizedLandingUrl('en'),
        fr: localizedLandingUrl('fr'),
        ar: localizedLandingUrl('ar'),
      },
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: copy.title,
      description: copy.description,
      url: localizedLandingUrl(locale),
      locale: copy.ogLocale,
      alternateLocale: OG_LOCALES.filter((value) => value !== copy.ogLocale),
      images: [
        {
          url: landingOgImageUrl(locale),
          width: 1200,
          height: 630,
          alt: copy.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.description,
      images: [landingOgImageUrl(locale)],
    },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
  }
}

/**
 * /agences metadata (#749, Council S11 §4 binding conditions): unlike
 * the homepage — which follows the global beta indexing gate — the
 * agency page is `index, follow` in all three locales from day one
 * (it is the forwardable, findable artefact of the agency funnel).
 * Canonical self-references per locale, hreflang en/fr/ar plus
 * `x-default` -> FR, and the title is absolute (the S11 FR pattern
 * carries its own closing segment, so the `%s | Ouiboo` template must
 * not append a second suffix).
 */
export function buildAgencesMetadata(locale: SupportedLanguage): Metadata {
  const copy = AGENCES_COPY[locale]
  const ogLocale = SITE_COPY[locale].ogLocale
  return {
    metadataBase: new URL(LANDING_URL),
    applicationName: SITE_NAME,
    title: { absolute: copy.title },
    description: copy.description,
    alternates: {
      canonical: localizedAgencesUrl(locale),
      languages: {
        en: localizedAgencesUrl('en'),
        fr: localizedAgencesUrl('fr'),
        ar: localizedAgencesUrl('ar'),
        'x-default': localizedAgencesUrl('fr'),
      },
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: copy.title,
      description: copy.description,
      url: localizedAgencesUrl(locale),
      locale: ogLocale,
      alternateLocale: OG_LOCALES.filter((value) => value !== ogLocale),
      images: [
        {
          url: landingOgImageUrl(locale),
          width: 1200,
          height: 630,
          alt: copy.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.description,
      images: [landingOgImageUrl(locale)],
    },
    robots: { index: true, follow: true },
  }
}
