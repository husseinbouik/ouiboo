import type { Metadata } from 'next';
import { absoluteTravelerUrl, metadataDescription } from '@/lib/site';

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

/**
 * Single source of truth for the public trip page metadata. Both the
 * segment layout and the page used to build their own (diverging) copies;
 * they now delegate here so the served Open Graph / Twitter tags are
 * deterministic: og:title, og:description, og:image (absolute cover URL)
 * and a summary_large_image Twitter card.
 */
export function buildTripMetadata(trip: TripMetadataInput | null): Metadata {
  if (!trip) {
    return {
      title: 'Trip not found — Ouiboo',
      robots: { index: false, follow: false },
    };
  }

  const title = `${trip.title} — Ouiboo`;
  const trimmedDescription = trip.description?.replace(/\s+/g, ' ').trim();
  const description = trimmedDescription
    ? metadataDescription(trip.description)
    : trip.durationDays && trip.startLocation
      ? `Book ${trip.title}, a ${trip.durationDays}-day trip from ${trip.startLocation}.`
      : metadataDescription(trip.description);
  const canonicalPath = `/trip/${encodeURIComponent(trip.id)}`;
  const coverImage = resolveTripCoverImage(trip);

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonicalPath,
      images: coverImage ? [{ url: coverImage, alt: trip.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: coverImage ? [coverImage] : undefined,
    },
  };
}
