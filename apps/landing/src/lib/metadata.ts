import type { Metadata } from 'next'
import type { SupportedLanguage } from '@ouiboo/i18n/server'
import {
  LANDING_URL,
  OG_LOCALES,
  SITE_COPY,
  SITE_NAME,
  isLandingIndexable,
  landingOgImageUrl,
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
