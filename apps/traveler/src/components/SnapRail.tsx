'use client';

import React, { useEffect, useRef, useState } from 'react';
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
 * - prev/next arrows are genuine 44px and always visible; since
 *   round 5 they never disable — the rail loops (below);
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
 *
 * Round 5 (2026-10-28, founder decision — SUPERSEDES the round-2
 * "no loop / arrows disable at the ends" spec): the rail LOOPS
 * seamlessly on both surfaces. With more than one photo, the
 * strip carries a clone of the last photo before the first and a
 * clone of the first photo after the last (extended positions
 * 0..count+1), so dragging or arrowing past either end continues
 * onto the wrapped photo with no jump-cut; when the scroll
 * settles on a clone, the rail silently repositions to the real
 * copy of the same photo (identical image at the identical
 * offset — invisible). Arrows never disable; the counter,
 * caption and dots always report the REAL position (1..count).
 *
 * Round 6 (2026-10-29, #654 — Council Session #5): host-driven
 * jumps of MORE than one position no longer smooth-scroll. A
 * filmstrip tap on a distant photo (and the viewer's keyboard
 * wrap from the last photo back to the first, which arrives here
 * as a distant externalIndex jump) visibly REWOUND through every
 * intermediate slide — contradicting the seamless-loop contract
 * above. Distant jumps now land instantly (scrollLeft assigned
 * with scroll-behavior forced off, the normalizeLoop technique);
 * genuine ±1 steps — arrows, drag settles, adjacent filmstrip
 * taps — keep the smooth glide.
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
  /** #623: host-driven jump (the full-screen viewer's filmstrip).
   * When this value changes to a real index other than the one the
   * rail already rests on, the rail scrolls to that photo. Drags and
   * arrow steps report back through onActiveChange, so a host that
   * mirrors the active index here sees no feedback loop: the effect
   * below no-ops whenever the requested index is already active. */
  externalIndex?: number;
  /** #623: the full-screen viewer shows photos whole (contain) on a
   * dark backdrop; every other surface fills its frame (cover). */
  imageFit?: 'cover' | 'contain';
  /** #623: a genuine click on a slide (never the click that follows
   * a drag — the root capture handler swallows those first) reports
   * the slide's real index. Hosts open the full-screen viewer with
   * it. Arrow/indicator clicks are outside the slides and never
   * reach this handler. */
  onSlideClick?: (index: number) => void;
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
  externalIndex,
  imageFit = 'cover',
  onSlideClick,
  slideStyle,
}: SnapRailProps) {
  const { t, i18n } = useTranslation();
  const railRef = useRef<HTMLDivElement | null>(null);
  const [currentImage, setCurrentImage] = useState(0);
  const currentRef = useRef(0);
  const imageCount = images.length;

  // #490 round 5: loop coordinates. With more than one photo the
  // strip is one photo longer at each end (see the header note):
  // extended position 0 is the last photo's clone, 1..imageCount
  // are the real photos, imageCount+1 is the first photo's clone.
  // currentImage / currentRef always hold the REAL index; extRef /
  // extIndex track the extended position the strip is resting on.
  const loop = imageCount > 1;
  const extCount = loop ? imageCount + 2 : imageCount;
  const toReal = (ext: number) => (loop ? (ext - 1 + imageCount) % imageCount : ext);
  const extRef = useRef(loop ? 1 : 0);
  const [extIndex, setExtIndex] = useState(loop ? 1 : 0);

  const dragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number; startExtIndex: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const setActive = (idx: number) => {
    if (currentRef.current === idx) return;
    currentRef.current = idx;
    setCurrentImage(idx);
    onActiveChange?.(idx);
  };

  const setExt = (ext: number) => {
    extRef.current = ext;
    setExtIndex(ext);
  };

  // Silently reposition from a clone to the real copy of the same
  // photo: an instant assignment (scroll-behavior forced off for
  // the jump) to the identical image at the identical offset, so
  // nothing visibly moves. A no-op anywhere else, and never during
  // a mouse drag (the drag's own release path owns settling then).
  const normalizeLoop = () => {
    const el = railRef.current;
    if (!el || !loop || el.clientWidth === 0 || dragRef.current) return;
    const width = el.clientWidth;
    const ext = Math.round(Math.abs(el.scrollLeft) / width);
    if (ext !== 0 && ext !== imageCount + 1) return;
    const target = ext === 0 ? imageCount : 1;
    el.style.scrollBehavior = 'auto';
    el.scrollLeft = (i18n.dir() === 'rtl' ? -1 : 1) * target * width;
    el.style.scrollBehavior = '';
    setExt(target);
  };
  const settleTimerRef = useRef<number | null>(null);

  const handleRailScroll = () => {
    const el = railRef.current;
    if (!el || el.clientWidth === 0) return;
    const ext = Math.max(0, Math.min(extCount - 1, Math.round(Math.abs(el.scrollLeft) / el.clientWidth)));
    setExt(ext);
    setActive(toReal(ext));
    // Loop normalization for engines without scrollend: once the
    // scroll comes to rest, reposition if it stopped on a clone.
    // (The scrollend listener below is the primary trigger.)
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(normalizeLoop, 150);
  };

  // Starting position: a looped strip starts on the REAL first
  // photo (position 1), not on the clone of the last that occupies
  // scroll position 0.
  useEffect(() => {
    const el = railRef.current;
    if (!el || !loop || el.clientWidth === 0) return;
    el.scrollLeft = (i18n.dir() === 'rtl' ? -1 : 1) * el.clientWidth;
    setExt(1);
    setActive(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  // Primary loop-normalization trigger: scrollend → reposition if
  // the strip came to rest on a clone. Re-registered every render
  // so the handler always closes over the current geometry; the
  // cleanup also drops any pending debounce timer on unmount.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const onScrollEnd = () => normalizeLoop();
    el.addEventListener('scrollend', onScrollEnd);
    return () => {
      el.removeEventListener('scrollend', onScrollEnd);
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    };
  });

  const scrollToExt = (ext: number) => {
    const el = railRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(extCount - 1, ext));
    // #654: a jump of more than one position lands INSTANTLY — a
    // smooth scroll would traverse (visibly rewind through) every
    // intermediate slide. The instant path assigns scrollLeft with
    // scroll-behavior forced off, exactly like normalizeLoop's
    // clone repositioning, and targets an exact snap point, so the
    // mandatory snap engine has nothing to correct. ±1 steps keep
    // the smooth glide.
    if (Math.abs(clamped - extRef.current) > 1) {
      el.style.scrollBehavior = 'auto';
      el.scrollLeft = (i18n.dir() === 'rtl' ? -1 : 1) * clamped * el.clientWidth;
      el.style.scrollBehavior = '';
    } else {
      el.scrollTo({
        left: (i18n.dir() === 'rtl' ? -1 : 1) * clamped * el.clientWidth,
        behavior: 'smooth',
      });
    }
    setExt(clamped);
    setActive(toReal(clamped));
  };

  const scrollToImage = (realIdx: number) => {
    const clamped = Math.max(0, Math.min(imageCount - 1, realIdx));
    scrollToExt(loop ? clamped + 1 : clamped);
  };

  // #623: host-driven jump (filmstrip). Fires only when the host
  // requests a photo the rail is not already resting on, so the
  // onActiveChange → host state → externalIndex round trip settles
  // instead of looping.
  useEffect(() => {
    if (externalIndex === undefined) return;
    if (externalIndex === currentRef.current) return;
    scrollToImage(externalIndex);
    // scrollToImage is render-scoped; the guard above keys the jump
    // to the requested index only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalIndex]);

  // Arrow step: normalize first (a click can land in the brief
  // window where the strip rests on a clone), then move exactly
  // one extended position — from the last photo that is the first
  // photo's clone, which settles and repositions to the real
  // first: a seamless wrap, never a rewind through every slide.
  const step = (dir: 1 | -1) => {
    normalizeLoop();
    scrollToExt(extRef.current + dir);
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

  const restoreSnapOnScrollEnd = (el: HTMLDivElement, onRestored?: () => void) => {
    cancelPendingSnapRestore();
    const restore = () => {
      snapRestoreRef.current = null;
      el.style.scrollSnapType = '';
      onRestored?.();
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
      // Extended position the drag starts from (round 5): with
      // the loop clones this is the strip position, not the real
      // photo index — the release math below works in the same
      // coordinates the scroll position does.
      startExtIndex:
        el.clientWidth > 0
          ? Math.max(0, Math.min(extCount - 1, Math.round(Math.abs(el.scrollLeft) / el.clientWidth)))
          : extRef.current,
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
    // #490 round 5: all of this runs in extended (loop) positions;
    // a settle can legitimately target a clone position, which
    // normalizeLoop then repositions to the real copy.
    let advancing = false;
    if (dragAdvanceOnRelease && el.clientWidth > 0) {
      const width = el.clientWidth;
      const settleExt = Math.max(
        0,
        Math.min(extCount - 1, Math.round(Math.abs(el.scrollLeft) / width)),
      );
      if (
        settleExt === drag.startExtIndex &&
        Math.abs(el.scrollLeft - drag.startScrollLeft) >= DRAG_ADVANCE_MIN_PX
      ) {
        const towardNext = Math.abs(el.scrollLeft) > drag.startExtIndex * width;
        scrollToExt(drag.startExtIndex + (towardNext ? 1 : -1));
        advancing = true;
      }
    }
    if (advancing) {
      // The settle scroll is already running with snap suspended;
      // restore snap when it ends so the returning engine cannot
      // override the settle mid-flight, then reposition if the
      // settle landed on a clone. Every other drag restores snap
      // immediately and keeps the native settle it had (whose own
      // scrollend/debounce normalization handles clones).
      restoreSnapOnScrollEnd(el, normalizeLoop);
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
        {Array.from({ length: extCount }, (_, pos) => {
          const logical = toReal(pos);
          const isClone = loop && (pos === 0 || pos === extCount - 1);
          return (
            <div
              key={pos}
              aria-hidden={isClone || undefined}
              onClick={onSlideClick ? () => onSlideClick(logical) : undefined}
              className="relative h-full w-full shrink-0 snap-center snap-always"
            >
              <SafeImage
                src={images[logical]}
                className={imageFit === 'contain' ? 'w-full h-full object-contain' : 'w-full h-full object-cover'}
                alt={imageAlts?.[logical]?.trim() || captionFallback}
                fill
                sizes={sizes}
                blurDataURL={imageBlurDataURLs?.[logical] ?? undefined}
                style={slideStyle?.(logical, pos === extIndex)}
              />
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

      {imageCount > 1 ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              // A host may wrap the rail in a link (trip cards link
              // the photo to the trip page): an arrow tap cycles
              // photos in place and must never activate that link.
              // On hosts without a surrounding link this is a no-op.
              event.preventDefault();
              step(-1);
            }}
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
            onClick={(event) => {
              // See the previous-arrow note: never activate a
              // surrounding host link.
              event.preventDefault();
              step(1);
            }}
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
