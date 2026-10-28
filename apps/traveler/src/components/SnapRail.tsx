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
 *
 * Round 3 (2026-10-28): the wiring is identical on both surfaces —
 * the witnessed difference was GEOMETRIC. This gallery's slides are
 * a full page width (~1200px) while a card's are ~390px, and native
 * snap-mandatory settles a released drag on the NEAREST snap point:
 * the same few-hundred-px drag that carries a card past its halfway
 * point never crosses the gallery's, so the gallery rail tracked
 * the pointer and then settled straight back onto the photo it
 * started on. Hosts with wide slides opt into `dragAdvanceOnRelease`
 * (below) so a moved drag settles one slide over, exactly the
 * outcome the same drag produces on a card.
 *
 * Round 4 (2026-10-28): round 3's geometry story was INCOMPLETE —
 * live reproduction showed the gallery image never moved AT ALL
 * during a mouse drag (not even at ~50% of a slide width), while a
 * card advanced discretely, mid-drag, with no partial slide shown.
 * Confirmed cause: `scroll-snap-type: x mandatory` stayed ACTIVE
 * for the whole drag (only `scroll-behavior` was suspended), and a
 * mandatory snap engine re-snaps `scrollLeft` to the nearest snap
 * point whenever the scroll rests — so between the discrete steps
 * of a real drag the position was silently reset to the start
 * slide (a card only APPEARED to drag because once cumulative
 * travel crossed its halfway point the snap target flipped and the
 * strip jumped a full slide), and at release `endDrag` read the
 * already-re-snapped `scrollLeft`, starving the round-3 guard.
 * The drag now suspends scroll-snap itself for its duration, and a
 * release settle is issued while snap is still suspended, restored
 * on scrollend. Round 4 also fixed touch: the rail carried
 * `touch-action: pan-y`, which DISABLES native horizontal panning
 * and hands horizontal gestures to script — and the script ignores
 * touch pointers by design — so touch drags were handled by
 * nobody on either surface. The rail is now `pan-x pan-y`: the
 * browser scrolls it natively with axis locking (vertical drags
 * still scroll the page).
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
  /** #490 round 3: when a mouse drag moved at least
   * DRAG_ADVANCE_MIN_PX but native snap would settle it back onto
   * the slide it started from, settle one slide over in the drag
   * direction on release. For wide-slide hosts (the trip-page
   * gallery); the card rail leaves this off and keeps the pure
   * native snap settle it was verified with. */
  dragAdvanceOnRelease?: boolean;
  onActiveChange?: (index: number) => void;
  /** Per-slide style hook (e.g. the shared-element view-transition
   * name belongs on the active slide only). */
  slideStyle?: (index: number, isActive: boolean) => React.CSSProperties | undefined;
}

const DRAG_CLICK_SUPPRESS_PX = 6;
/** #490 round 3: a drag shorter than this is a press, not a swipe —
 * it settles back onto the current slide even with
 * dragAdvanceOnRelease on. Well above click jitter, well below the
 * few-hundred-px drag that advances a card. */
const DRAG_ADVANCE_MIN_PX = 64;

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
  dragAdvanceOnRelease = false,
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

  // Mouse drag-to-scroll. Touch and pen keep native scrolling: the
  // viewport's touch-action is `pan-x pan-y`, so the browser itself
  // pans the rail horizontally and scrolls the page vertically,
  // axis-locked — script drag state is created for the mouse only.
  // (Round 4: the rail previously carried `pan-y` alone, which
  // disables native horizontal panning and hands the gesture to
  // script; combined with the mouse-only handler below, touch
  // drags were handled by nobody.) Pointer capture retargets the
  // follow-up click to the rail, and the click-capture handler
  // below swallows it when the drag actually moved, so a drag
  // never follows a link or toggles an overlay control.
  const dragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number; startIndex: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  // #490 round 4: a release settle issued while scroll-snap was
  // suspended (below) restores snap only once the programmatic
  // scroll ends, so the returning snap engine cannot override the
  // settle mid-flight. Tracked here so a new drag can cancel a
  // pending restore instead of having snap reappear mid-gesture.
  const snapRestoreRef = useRef<{ el: HTMLDivElement; timer: number; onScrollEnd: () => void } | null>(null);

  const cancelPendingSnapRestore = () => {
    const pending = snapRestoreRef.current;
    if (!pending) return;
    snapRestoreRef.current = null;
    window.clearTimeout(pending.timer);
    pending.el.removeEventListener('scrollend', pending.onScrollEnd);
  };

  const restoreSnapOnScrollEnd = (el: HTMLDivElement) => {
    cancelPendingSnapRestore();
    const restore = () => {
      snapRestoreRef.current = null;
      el.style.scrollSnapType = '';
    };
    const onScrollEnd = () => {
      window.clearTimeout(timer);
      restore();
    };
    // Fallback for engines without a scrollend event: the settle
    // scroll is well under this bound.
    const timer = window.setTimeout(() => {
      el.removeEventListener('scrollend', onScrollEnd);
      restore();
    }, 700);
    snapRestoreRef.current = { el, timer, onScrollEnd };
    el.addEventListener('scrollend', onScrollEnd, { once: true });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || imageCount <= 1) return;
    const el = railRef.current;
    if (!el) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: el.scrollLeft,
      startIndex: currentRef.current,
      moved: false,
    };
    // The viewport carries scroll-smooth for arrow navigation; a drag
    // must track the pointer 1:1, so smooth behaviour is suspended
    // for the duration of the drag and restored on release.
    el.style.scrollBehavior = 'auto';
    // #490 round 4: scroll-snap is suspended for the drag too. Left
    // active, the mandatory snap engine re-snaps scrollLeft to the
    // nearest snap point every time the scroll rests — between the
    // steps of a real drag the position was silently reset to the
    // start slide (so the wide gallery appeared not to move at
    // all), and the release handler read the already-re-snapped
    // scrollLeft, starving its settle decision.
    cancelPendingSnapRestore();
    el.style.scrollSnapType = 'none';
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
    if (!el) return;
    el.style.scrollBehavior = '';
    if (!drag.moved) {
      // A press, not a drag: hand scroll-snap straight back.
      el.style.scrollSnapType = '';
      return;
    }
    suppressClickRef.current = true;
    // Safety net: if no click follows (e.g. pointer released
    // outside), do not swallow a later genuine click.
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 350);
    // #490 round 3: wide-slide hosts (dragAdvanceOnRelease) — if
    // the drag moved a real swipe distance but native snap would
    // settle it back onto the slide it started from (the drag
    // never crossed that slide's halfway point), settle one slide
    // over in the drag direction instead. The direction uses the
    // same |scrollLeft| model as handleRailScroll, so it holds in
    // LTR and RTL alike. A drag that already crossed into a
    // neighbouring slide's range keeps the native settle.
    // #490 round 4: snap was suspended for the whole drag, so the
    // scrollLeft read here is the position the pointer actually
    // reached — not the start slide the snap engine used to reset
    // it to before this handler ran.
    let advancing = false;
    if (dragAdvanceOnRelease && el.clientWidth > 0) {
      const width = el.clientWidth;
      const settleIndex = Math.max(
        0,
        Math.min(imageCount - 1, Math.round(Math.abs(el.scrollLeft) / width)),
      );
      if (
        settleIndex === drag.startIndex &&
        Math.abs(el.scrollLeft - drag.startScrollLeft) >= DRAG_ADVANCE_MIN_PX
      ) {
        const towardNext = Math.abs(el.scrollLeft) > drag.startIndex * width;
        scrollToImage(drag.startIndex + (towardNext ? 1 : -1));
        advancing = true;
      }
    }
    if (advancing) {
      // The settle scroll is already running with snap suspended;
      // restore snap when it ends so the returning engine cannot
      // override the settle mid-flight. Every other drag restores
      // snap immediately and keeps the native settle it had.
      restoreSnapOnScrollEnd(el);
    } else {
      el.style.scrollSnapType = '';
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
          'flex overflow-x-auto snap-x snap-mandatory scroll-smooth [touch-action:pan-x_pan-y] select-none cursor-grab active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
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
