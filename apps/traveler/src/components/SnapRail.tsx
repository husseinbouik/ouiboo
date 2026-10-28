'use client';

import React, { useRef, useState } from 'react';
import { SafeImage } from '@ouiboo/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';

/**
 * #490 — Option A "Snap Rail" (founder decision, FINAL): ONE photo
 * rail component with ONE behaviour on every surface (trip-page
 * gallery and home/search cards):
 *
 * - native scroll-snap does the gliding — touch swipe scrolls the
 *   rail natively, and a mouse drag scrolls it too (pointer-capture
 *   drag-to-scroll below; `scrollLeft = start - dx` is direction-
 *   agnostic because the RTL negative-scrollLeft model mirrors the
 *   LTR one, the same convention scrollToImage already used);
 * - the counter (current / total) and the caption are ALWAYS
 *   visible — the card previously showed dots only;
 * - prev/next arrows are genuine 44px, always visible, and DISABLE
 *   at the ends — there is NO loop (the card previously wrapped
 *   from the last photo back to the first);
 * - a drag that actually moved suppresses the click that follows it,
 *   so drags never follow links or toggle the wishlist.
 *
 * Round 2 (2026-10-28): the rail was extracted from TripDetailsClient
 * (where it passed witnessed verification) so the card renders this
 * exact component instead of its old crossfade carousel, whose
 * arrows looped and whose drag/swipe advanced nothing.
 */
export interface SnapRailProps {
  images: string[];
  /** Agency alt text per image (index-aligned); may be absent. */
  imageAlts?: (string | null | undefined)[];
  /** Stored blur placeholders per image (index-aligned); may be absent. */
  imageBlurDataURLs?: (string | null | undefined)[];
  /** Caption when an image has no alt text (the trip title). */
  captionFallback: string;
  /** Accessible label for the rail group. */
  ariaLabel: string;
  /** Classes for the scroll viewport (heights, rounding contexts). */
  viewportClassName?: string;
  /** Classes for the relative root (rounding, shadow, border). */
  rootClassName?: string;
  sizes?: string;
  testId?: string;
  counterTestId?: string;
  /** Trip-page arrows rest until lg; card arrows are always shown. */
  arrowsClassName?: string;
  /** Card keeps its dot indicators (real buttons, Session #3 P0-1);
   * the trip-page gallery does not render them. */
  showIndicators?: boolean;
  onActiveChange?: (index: number) => void;
  /** Per-slide style hook (e.g. the shared-element view-transition
   * name belongs on the active slide only). */
  slideStyle?: (index: number, isActive: boolean) => React.CSSProperties | undefined;
}

const DRAG_CLICK_SUPPRESS_PX = 6;

export function SnapRail({
  images,
  imageAlts,
  imageBlurDataURLs,
  captionFallback,
  ariaLabel,
  viewportClassName,
  rootClassName,
  sizes = '100vw',
  testId,
  counterTestId,
  arrowsClassName,
  showIndicators = false,
  onActiveChange,
  slideStyle,
}: SnapRailProps) {
  const { t, i18n } = useTranslation();
  const railRef = useRef<HTMLDivElement | null>(null);
  const [currentImage, setCurrentImage] = useState(0);
  const currentRef = useRef(0);
  const imageCount = images.length;

  const setActive = (idx: number) => {
    if (currentRef.current === idx) return;
    currentRef.current = idx;
    setCurrentImage(idx);
    onActiveChange?.(idx);
  };

  const handleRailScroll = () => {
    const el = railRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
    setActive(Math.max(0, Math.min(imageCount - 1, idx)));
  };

  const scrollToImage = (idx: number) => {
    const el = railRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(imageCount - 1, idx));
    el.scrollTo({
      left: (i18n.dir() === 'rtl' ? -1 : 1) * clamped * el.clientWidth,
      behavior: 'smooth',
    });
    setActive(clamped);
  };

  // Mouse drag-to-scroll. Touch and pen keep native scrolling (the
  // viewport is touch-pan-y, so vertical gestures still scroll the
  // page and horizontal ones pan the rail natively). Pointer capture
  // retargets the follow-up click to the rail, and the click-capture
  // handler below swallows it when the drag actually moved, so a
  // drag never follows a link or toggles an overlay control.
  const dragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || imageCount <= 1) return;
    const el = railRef.current;
    if (!el) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: el.scrollLeft,
      moved: false,
    };
    // The viewport carries scroll-smooth for arrow navigation; a drag
    // must track the pointer 1:1, so smooth behaviour is suspended
    // for the duration of the drag and restored on release.
    el.style.scrollBehavior = 'auto';
    try {
      el.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer already released — the drag simply will not track.
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = railRef.current;
    if (!drag || !el || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    if (Math.abs(dx) > DRAG_CLICK_SUPPRESS_PX) drag.moved = true;
    if (drag.moved) {
      el.scrollLeft = drag.startScrollLeft - dx;
    }
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    const el = railRef.current;
    if (el) el.style.scrollBehavior = '';
    if (drag.moved) {
      suppressClickRef.current = true;
      // Safety net: if no click follows (e.g. pointer released
      // outside), do not swallow a later genuine click.
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 350);
    }
  };

  const handleClickCapture = (event: React.MouseEvent) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const caption = imageAlts?.[currentImage]?.trim() || captionFallback;

  return (
    <div
      className={cn('relative', rootClassName)}
      data-testid={testId}
      onClickCapture={handleClickCapture}
      onDragStart={(event) => event.preventDefault()}
    >
      <div
        ref={railRef}
        onScroll={handleRailScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="group"
        aria-label={ariaLabel}
        className={cn(
          'flex overflow-x-auto snap-x snap-mandatory scroll-smooth touch-pan-y select-none cursor-grab active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          viewportClassName,
        )}
      >
        {images.map((src, idx) => (
          <div key={idx} className="relative h-full w-full shrink-0 snap-center snap-always">
            <SafeImage
              src={src}
              className="w-full h-full object-cover"
              alt={imageAlts?.[idx]?.trim() || captionFallback}
              fill
              sizes={sizes}
              blurDataURL={imageBlurDataURLs?.[idx] ?? undefined}
              style={slideStyle?.(idx, idx === currentImage)}
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

      {imageCount > 1 ? (
        <>
          <button
            type="button"
            onClick={() => scrollToImage(currentImage - 1)}
            disabled={currentImage === 0}
            aria-label={t('tripCard.previousImage')}
            className={cn(
              'absolute start-4 top-1/2 flex w-11 h-11 min-w-11 min-h-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/95 text-foreground shadow-md backdrop-blur-sm transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100',
              arrowsClassName,
            )}
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => scrollToImage(currentImage + 1)}
            disabled={currentImage >= imageCount - 1}
            aria-label={t('tripCard.nextImage')}
            className={cn(
              'absolute end-4 top-1/2 flex w-11 h-11 min-w-11 min-h-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/95 text-foreground shadow-md backdrop-blur-sm transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100',
              arrowsClassName,
            )}
          >
            <ChevronRight className="h-5 w-5 rtl:rotate-180" />
          </button>
        </>
      ) : null}

      {showIndicators && imageCount > 1 ? (
        <div className="absolute bottom-12 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {images.map((_: string, i: number) => (
            <button
              key={i}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                scrollToImage(i);
              }}
              aria-label={t('tripCard.viewImage', { count: i + 1 })}
              aria-current={currentImage === i || undefined}
              className="flex items-center justify-center p-1 -m-0.5"
            >
              <span
                className={cn(
                  'block h-1.5 rounded-full shadow-sm transition-all duration-300',
                  currentImage === i ? 'w-6 bg-white' : 'w-1.5 bg-white/60',
                )}
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
        <span className="min-w-0 truncate rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
          {caption}
        </span>
        {imageCount > 1 ? (
          <span
            data-testid={counterTestId}
            className="shrink-0 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md"
          >
            {t('tripCard.imageCounter', { current: currentImage + 1, total: imageCount })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
