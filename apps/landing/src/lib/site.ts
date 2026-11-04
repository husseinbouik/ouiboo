import { isLocalhostUrl } from '@ouiboo/utils'
import type { SupportedLanguage } from '@ouiboo/i18n/server'

export const SITE_NAME = 'Ouiboo'

const LOCAL_DEV_LANDING_URL = 'http://localhost:3004'

/**
 * Canonical production origin, used only when a production build has
 * neither a configured NEXT_PUBLIC_LANDING_URL nor a Vercel host to
 * derive one from (e.g. the CI e2e build, which sets neither). It is
 * this app's production project domain. A production build must NEVER
 * fall through to the loopback default: Next resolves the page's
 * relative canonical/OG URLs against metadataBase, so a localhost
 * LANDING_URL bakes http://localhost:3004 into the canonical link,
 * og:url, og:image and twitter:image of every page (#603 — the same
 * fallthrough PR #601 fixed in the traveller resolver).
 */
const PRODUCTION_LANDING_URL = 'https://ouiboo-landing.vercel.app'

/**
 * The landing app's public origin: the metadata base for canonical/OG
 * URLs and the sitemap URLs (#564).
 *
 * Mirrors the traveller app's resolver (`apps/traveler/src/lib/site.ts`,
 * #468): NEXT_PUBLIC_LANDING_URL is the configured source and is set on
 * every deployed project. The loopback default exists for local
 * development only — in a production build whose configured value is
 * missing or loopback, fall back to this deployment's own Vercel host,
 * and then to the canonical production origin, rather than baking
 * localhost into canonical URLs, OG URLs or the sitemap (the served
 * sitemap advertised `http://localhost:3004/`).
 */
function resolveLandingUrl(): string {
  const configured = process.env.NEXT_PUBLIC_LANDING_URL?.trim()
  if (configured && !isLocalhostUrl(configured)) return configured
  if (process.env.NODE_ENV === 'production') {
    const vercelHost =
      process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
    if (vercelHost) return `https://${vercelHost}`
    return PRODUCTION_LANDING_URL
  }
  return configured || LOCAL_DEV_LANDING_URL
}

export const LANDING_URL = resolveLandingUrl()

export function absoluteLandingUrl(path: string): string {
  return new URL(path, `${LANDING_URL}/`).toString()
}

/**
 * Indexing gate (#564): the landing stays noindexed while the closed
 * beta runs — the same deliberate gate as the traveller sitemap's beta
 * exclusion. `robots.ts`, `sitemap.ts` and the page metadata all read
 * this one switch so the three can never contradict each other again:
 * either the site is indexable (robots allows, sitemap lists the real
 * public URLs, metadata indexes) or it is not (robots disallows,
 * sitemap is empty, metadata is noindex). Flipping
 * NEXT_PUBLIC_LANDING_INDEXABLE to 'true' at public launch lifts all
 * three together.
 */
export function isLandingIndexable(
  value: string | undefined = process.env.NEXT_PUBLIC_LANDING_INDEXABLE,
): boolean {
  return value === 'true'
}

/**
 * Canonical brand copy (#563). ONE tagline across surfaces: the strings
 * below are the email layout's taglines (`apps/api/src/email/email-i18n.ts`
 * — en "Travel made personal", fr "Le voyage rendu personnel",
 * ar "سفر مصمم على مقاسك"), so the landing title/OG copy and the email
 * tagline are the same sentence in every locale. The traveller OG still
 * carries its older "Find trips worth remembering" line — aligning it
 * is a one-line change owned by the traveller batch (noted on #563).
 */
export interface SiteCopy {
  tagline: string
  title: string
  description: string
  ogLocale: string
}

export const SITE_COPY: Record<SupportedLanguage, SiteCopy> = {
  en: {
    tagline: 'Travel made personal',
    title: 'Ouiboo — Travel made personal',
    description:
      'Discover memorable trips from local travel experts and manage every booking with confidence.',
    ogLocale: 'en_US',
  },
  fr: {
    tagline: 'Le voyage rendu personnel',
    title: 'Ouiboo — Le voyage rendu personnel',
    description:
      'Découvrez des voyages mémorables proposés par des experts locaux et gérez chaque réservation en toute confiance.',
    ogLocale: 'fr_FR',
  },
  ar: {
    tagline: 'سفر مصمم على مقاسك',
    title: 'Ouiboo — سفر مصمم على مقاسك',
    description:
      'اكتشف رحلات لا تُنسى من خبراء سفر محليين وأدر كل حجز بثقة.',
    ogLocale: 'ar_MA',
  },
}

export const OG_LOCALES = Object.values(SITE_COPY).map((copy) => copy.ogLocale)

/** Locale-carrying share URL: the app already honours `?lang=` (see the
 * language-init script in @ouiboo/i18n), so a shared link can carry the
 * locale its preview is rendered in (#563). */
export function localizedLandingUrl(locale: SupportedLanguage): string {
  return `${LANDING_URL}/?lang=${locale}`
}

export function landingOgImageUrl(locale: SupportedLanguage): string {
  return absoluteLandingUrl(`/og-image?lang=${locale}`)
}

/**
 * /agences copy (#749, Council S11 §4): the dedicated agency page is
 * FR-first (authored French title pattern from the S11 build
 * conditions), indexable in all three locales from day one, and its
 * canonical/hreflang set carries `x-default` -> FR. Kept beside
 * SITE_COPY so the landing's per-route copy lives in one module.
 */
export interface AgencesCopy {
  title: string
  description: string
}

export const AGENCES_COPY: Record<SupportedLanguage, AgencesCopy> = {
  fr: {
    title: 'Ouiboo pour les agences — vendez vos voyages, payés en direct | Bêta gratuite au Maroc',
    description:
      "Rejoignez la bêta gratuite d'Ouiboo : présentez vos voyages, soyez payé directement par les voyageurs, 0 MAD pendant la bêta — vérification avant mise en ligne.",
  },
  en: {
    title: 'Ouiboo for agencies — sell your trips, get paid directly | Free beta in Morocco',
    description:
      "Join Ouiboo's free beta: present your trips, get paid directly by travellers, 0 MAD during the beta — checked before listing.",
  },
  ar: {
    title: 'Ouiboo للوكالات — بيعوا رحلاتكم واقبضوا مباشرة | نسخة تجريبية مجانية في المغرب',
    description:
      'انضموا إلى النسخة التجريبية المجانية من Ouiboo: اعرضوا رحلاتكم واقبضوا مباشرة من المسافرين، 0 درهم خلال النسخة التجريبية — مع التحقق قبل النشر.',
  },
}

export function localizedAgencesUrl(locale: SupportedLanguage): string {
  return `${LANDING_URL}/agences?lang=${locale}`
}
