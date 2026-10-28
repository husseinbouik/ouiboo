import type { Metadata } from 'next';
import { isBetaBadgeEnabled, isSharingEnabled, scrubShareClaimWords } from '@ouiboo/utils';
import { absoluteTravelerUrl, metadataDescription, OG_LOCALES, SITE_COPY, SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';
import type { SupportedLanguage } from '@ouiboo/i18n/server';

export type TripMetadataInput = {
  id: string;
  title: string;
  description?: string | null;
  images?: string[] | null;
  durationDays?: number | null;
  startLocation?: string | null;
};

/**
 * #468: cover image as an absolute URL. Social scrapers (WhatsApp,
 * Facebook, X, Telegram) ignore relative og:image values, so anything
 * that is not already absolute is resolved against the traveller origin.
 */
export function resolveTripCoverImage(trip: TripMetadataInput): string | undefined {
  const image = trip.images?.find((value) => typeof value === 'string' && value.trim().length > 0);
  if (!image) return undefined;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith('/')) return absoluteTravelerUrl(image);
  return undefined;
}

export interface TripMetadataOptions {
  /**
   * #563 rework: the visitor locale the OG copy was resolved in. The
   * builder ALWAYS emits openGraph.locale (this locale's og:locale)
   * plus alternateLocale (the other locales) — previously it omitted
   * both, and because Next replaces the openGraph object when a child
   * segment defines one, the root layout's locale tags never reached
   * trip pages (deployed traveller served zero og:locale tags).
   * Defaults to 'en' for callers that have no locale context.
   */
  locale?: SupportedLanguage;
  /**
   * Council B12: rich trip previews are gated by NEXT_PUBLIC_SHARING_ENABLED
   * (default OFF for the closed beta). Injectable for tests; defaults to the
   * env flag.
   */
  sharingEnabled?: boolean;
  /**
   * Council Session #2 B11 / Session #3 P0-5 (#553): while the closed
   * beta runs, trip routes are invited-only — they serve `noindex` and
   * stay out of the sitemap. Gated on the same beta condition as the
   * BETA badge (NEXT_PUBLIC_BETA_BADGE, on unless exactly 'false'), so
   * the public-launch flag flip lifts both together. Injectable for
   * tests; defaults to the env flag.
   */
  betaMode?: boolean;
}

/**
 * Single source of truth for the public trip page metadata. Both the
 * segment layout and the page used to build their own (diverging) copies;
 * they now delegate here so the served Open Graph / Twitter tags are
 * deterministic: og:title, og:description, og:image (absolute cover URL)
 * and a summary_large_image Twitter card.
 *
 * Council B12: while sharing is gated off, a trip URL serves only a
 * generic, claim-free preview — no agency-written title, description or
 * cover image. When sharing is on, agency-written copy still passes
 * through the claim-word scrubber before it can reach a preview card.
 */
export function buildTripMetadata(
  trip: TripMetadataInput | null,
  options: TripMetadataOptions = {},
): Metadata {
  const locale = options.locale ?? 'en';
  const ogLocale = SITE_COPY[locale].ogLocale;
  const alternateLocale = OG_LOCALES.filter((value) => value !== ogLocale);

  if (!trip) {
    return {
      // #576: no manual brand suffix — the root layout template
      // ("%s | Ouiboo") appends the brand. A suffixed string here
      // rendered the tab title as "Trip not found — Ouiboo | Ouiboo".
      title: 'Trip not found',
      robots: { index: false, follow: false },
      openGraph: { locale: ogLocale, alternateLocale },
    };
  }

  const canonicalPath = `/trip/${encodeURIComponent(trip.id)}`;
  const sharingEnabled = options.sharingEnabled ?? isSharingEnabled();
  const betaMode = options.betaMode ?? isBetaBadgeEnabled();
  // B11: invited-only slice — trip pages must not be indexed while beta.
  const betaRobots: Metadata['robots'] = betaMode
    ? { index: false, follow: false }
    : undefined;

  if (!sharingEnabled) {
    return {
      // #576: `absolute` opts out of the root layout's "%s | Ouiboo"
      // template — a plain SITE_NAME string rendered "Ouiboo | Ouiboo".
      title: { absolute: SITE_NAME },
      description: SITE_DESCRIPTION,
      robots: betaRobots,
      alternates: { canonical: canonicalPath },
      openGraph: {
        type: 'website',
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: canonicalPath,
        locale: ogLocale,
        alternateLocale,
      },
      twitter: {
        card: 'summary',
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
      },
    };
  }

  // #576: the page title carries no manual brand suffix (the root
  // layout template appends "| Ouiboo"); social previews are not
  // templated, so og:/twitter: titles keep the explicit suffix.
  const title = scrubShareClaimWords(trip.title);
  const socialTitle = `${title} — Ouiboo`;
  const trimmedDescription = trip.description?.replace(/\s+/g, ' ').trim();
  const description = scrubShareClaimWords(
    trimmedDescription
      ? metadataDescription(trip.description)
      : trip.durationDays && trip.startLocation
        ? `Book ${trip.title}, a ${trip.durationDays}-day trip from ${trip.startLocation}.`
        : metadataDescription(trip.description),
  );
  const coverImage = resolveTripCoverImage(trip);

  return {
    title,
    description,
    robots: betaRobots,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'website',
      title: socialTitle,
      description,
      url: canonicalPath,
      locale: ogLocale,
      alternateLocale,
      images: coverImage ? [{ url: coverImage, alt: trip.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: coverImage ? [coverImage] : undefined,
    },
  };
}
