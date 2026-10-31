'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SafeImage } from '@ouiboo/ui';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';
import { SnapRail } from './SnapRail';

/**
 * #623 — full-screen photo viewer (design batch, founder decision
 * 2026-10-28 from the Airbnb/Booking wireframe comparison): both
 * rivals open a full-screen viewer, Ouiboo had none. The viewer is
 * the shared Snap Rail on a dark backdrop, so it inherits the
 * witnessed #490 behaviour exactly — seamless loop, drag/swipe,
 * always-visible counter and per-photo caption (the caption is
 * Ouiboo's edge over both rivals) — with photos shown whole
 * (contain). A Booking-style filmstrip along the bottom jumps
 * straight to any photo through the rail's externalIndex jump.
 *
 * Chrome around the rail: Esc closes, arrow keys step (direction
 * follows the UI's text direction), focus is trapped while open,
 * body scroll is locked, and closing returns focus to whatever
 * opened the viewer.
 */
export interface PhotoViewerProps {
  images: string[];
  /** Agency alt text per image (index-aligned); may be absent. */
  imageAlts?: (string | null | undefined)[];
  /** Stored blur placeholders per image (index-aligned); may be absent. */
  imageBlurDataURLs?: (string | null | undefined)[];
  /** Caption when an image has no alt text (the trip title). */
  captionFallback: string;
  /** Photo the viewer opens on (the one that was tapped). */
  initialIndex: number;
  onClose: () => void;
}

export function PhotoViewer({
  images,
  imageAlts,
  imageBlurDataURLs,
  captionFallback,
  initialIndex,
  onClose,
}: PhotoViewerProps) {
  const { t, i18n } = useTranslation();
  const imageCount = images.length;
  const clampIndex = (idx: number) =>
    imageCount > 0 ? Math.max(0, Math.min(imageCount - 1, idx)) : 0;
  const [activeIndex, setActiveIndex] = useState(() => clampIndex(initialIndex));
  const containerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const step = (dir: 1 | -1) => {
    if (imageCount <= 1) return;
    setActiveIndex((cur) => (cur + dir + imageCount) % imageCount);
  };

  // Focus trap + body scroll lock + focus restoration, mirroring
  // the traveller mobile menu's dialog discipline (Navbar.tsx).
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        // Step in the direction the arrow points on screen: in RTL
        // the rail's "next" runs to the left, like its chevrons.
        const forward = event.key === 'ArrowRight' ? 1 : -1;
        step(i18n.dir() === 'rtl' ? (-forward as 1 | -1) : (forward as 1 | -1));
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = containerRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
    // Mounted once per open by the host (conditional render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('tripDetails.photosLabel')}
      data-testid="photo-viewer"
      className="fixed inset-0 z-[110] flex flex-col bg-black/95 backdrop-blur-sm"
    >
      <div className="flex items-center justify-end p-3 sm:p-4">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t('common.closeDialog')}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunset-orange"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <SnapRail
          images={images}
          imageAlts={imageAlts}
          imageBlurDataURLs={imageBlurDataURLs}
          captionFallback={captionFallback}
          ariaLabel={t('tripDetails.photosLabel')}
          rootClassName="h-full"
          viewportClassName="h-full"
          sizes="100vw"
          testId="photo-viewer-rail"
          counterTestId="photo-viewer-counter"
          dragAdvanceOnRelease
          imageFit="contain"
          externalIndex={activeIndex}
          onActiveChange={setActiveIndex}
        />
      </div>

      {imageCount > 1 ? (
        <nav
          aria-label={t('tripDetails.photosLabel')}
          className="flex gap-2 overflow-x-auto px-4 py-3 sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={t('tripCard.viewImage', { count: i + 1 })}
              aria-current={activeIndex === i || undefined}
              className={cn(
                'relative h-16 w-24 shrink-0 overflow-hidden rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunset-orange',
                activeIndex === i
                  ? 'ring-2 ring-sunset-orange ring-offset-2 ring-offset-black'
                  : 'opacity-50 hover:opacity-100',
              )}
            >
              <SafeImage
                src={src}
                alt={imageAlts?.[i]?.trim() || captionFallback}
                fill
                sizes="96px"
                className="h-full w-full object-cover"
                blurDataURL={imageBlurDataURLs?.[i] ?? undefined}
              />
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
