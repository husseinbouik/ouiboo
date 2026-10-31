'use client';

import React from 'react';
import { SafeImage } from '@ouiboo/ui';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';

/**
 * #624 — desktop trip-page gallery (design batch, founder decision
 * 2026-10-28 from the Airbnb/Booking wireframe comparison): at
 * desktop widths the single wide carousel gives way to Airbnb's
 * mosaic — the cover photo large on the left, photos 2–5 in a 2×2
 * block on the right — so the first five photos are all visible
 * with zero interaction. Clicking any cell opens the full-screen
 * viewer (#623) at that photo. Photos beyond the fifth live in the
 * viewer (its filmstrip covers the whole set).
 *
 * Degradation: 1 photo spans the whole grid; 2 photos split it in
 * half; 3 photos stack the two smaller ones down the right side;
 * 4 photos leave the last right cell spanning both columns.
 * Below desktop the host renders the Snap Rail instead (#625), so
 * this component is only ever mounted at lg+.
 */
export interface TripMosaicProps {
  images: string[];
  /** Agency alt text per image (index-aligned); may be absent. */
  imageAlts?: (string | null | undefined)[];
  /** Stored blur placeholders per image (index-aligned); may be absent. */
  imageBlurDataURLs?: (string | null | undefined)[];
  /** Caption when an image has no alt text (the trip title). */
  captionFallback: string;
  onPhotoClick: (index: number) => void;
  /** Style for the cover photo (the shared-element view-transition
   * name pairs it with the card cover, as the rail did before). */
  coverStyle?: React.CSSProperties;
}

export function TripMosaic({
  images,
  imageAlts,
  imageBlurDataURLs,
  captionFallback,
  onPhotoClick,
  coverStyle,
}: TripMosaicProps) {
  const { t } = useTranslation();
  const shown = images.slice(0, 5);
  const count = shown.length;

  const cellSpan = (i: number): string => {
    if (count === 1) return 'col-span-4 row-span-2';
    if (i === 0) return 'col-span-2 row-span-2';
    const rest = count - 1;
    if (rest === 1) return 'col-span-2 row-span-2';
    if (rest === 2) return 'col-span-2 row-span-1';
    if (rest === 3) return i === 3 ? 'col-span-2 row-span-1' : 'col-span-1 row-span-1';
    return 'col-span-1 row-span-1';
  };

  return (
    <div
      data-testid="trip-gallery-mosaic"
      className="grid h-[520px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl"
    >
      {shown.map((src, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPhotoClick(i)}
          aria-label={t('tripCard.viewImage', { count: i + 1 })}
          className={cn(
            'group relative block h-full w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sunset-orange',
            cellSpan(i),
          )}
        >
          <SafeImage
            src={src}
            alt={imageAlts?.[i]?.trim() || captionFallback}
            fill
            sizes={i === 0 ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, 50vw'}
            className="h-full w-full object-cover transition duration-300 group-hover:brightness-[0.85]"
            blurDataURL={imageBlurDataURLs?.[i] ?? undefined}
            style={i === 0 ? coverStyle : undefined}
          />
        </button>
      ))}
    </div>
  );
}
