/**
 * @jest-environment jsdom
 *
 * #490: the shared Snap Rail (trip-page gallery + cards) locked
 * behaviour:
 * - counter + caption are always rendered,
 * - the rail LOOPS seamlessly (round 5, founder decision —
 *   supersedes the round-2 "arrows disable at the ends" spec):
 *   clone slides at both ends, arrows never disable, and the
 *   counter/caption/dots always report the real position,
 * - a mouse drag scrolls the rail (drag-to-scroll), and the click
 *   that follows a real drag is swallowed,
 * - native scroll position drives the counter (touch swipe path).
 *
 * Round 4 adds the mechanism contracts the live failure exposed:
 * scroll-snap is suspended for the duration of a mouse drag (a
 * mandatory snap engine left active re-snaps scrollLeft mid-drag
 * and starves the release logic), and the viewport's touch-action
 * permits native horizontal panning (pan-y alone disabled it and
 * orphaned every touch drag).
 *
 * Geometry used throughout: with 3 photos the strip has 5
 * positions — 0 = clone of photo 3, 1..3 = the real photos,
 * 4 = clone of photo 1. A mounted rail rests at position 1
 * (scrollLeft = one slide width); tests set that position
 * explicitly because jsdom has no layout to do it.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SnapRail } from './SnapRail';

/** fireEvent drops pointerType/pointerId/clientX in this jsdom setup,
 * so pointer gestures are dispatched as constructed events (verified
 * to reach React's handlers with their properties intact). */
function pointer(type: string, props: Record<string, unknown>) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true });
    for (const [key, value] of Object.entries(props)) {
        Object.defineProperty(event, key, { value });
    }
    return event;
}

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => {
            if (key === 'tripCard.imageCounter') return `${options?.current} / ${options?.total}`;
            if (key === 'tripCard.viewImage') return `View image ${options?.count}`;
            return key;
        },
        i18n: { language: 'en', dir: () => 'ltr' },
    }),
}));

jest.mock('next/image', () => ({
    __esModule: true,
    // eslint-disable-next-line @next/next/no-img-element
    default: (props: any) => <img {...props} alt={props.alt} />,
}));

const IMAGES = ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg', 'https://cdn.example.com/c.jpg'];

function renderRail(props: Partial<React.ComponentProps<typeof SnapRail>> = {}, width = 300) {
    const utils = render(
        <SnapRail
            images={IMAGES}
            imageAlts={['First alt', 'Second alt', 'Third alt']}
            captionFallback="Fallback title"
            ariaLabel="Trip photos"
            counterTestId="rail-counter"
            showIndicators
            {...props}
        />,
    );
    const viewport = utils.container.querySelector('[role="group"]') as HTMLDivElement;
    // jsdom has no layout: give the viewport a width and a scrollTo spy.
    Object.defineProperty(viewport, 'clientWidth', { value: width, configurable: true });
    viewport.scrollTo = jest.fn();
    viewport.setPointerCapture = jest.fn();
    // A mounted looped rail rests on the real first photo
    // (position 1); put it there and sync the scroll bookkeeping.
    viewport.scrollLeft = width;
    fireEvent.scroll(viewport);
    return { ...utils, viewport };
}

const prev = () => screen.getByLabelText('tripCard.previousImage') as HTMLButtonElement;
const next = () => screen.getByLabelText('tripCard.nextImage') as HTMLButtonElement;
const counter = () => screen.getByTestId('rail-counter');

describe('SnapRail (#490)', () => {
    it('renders counter + caption with both arrows enabled (the loop has no ends)', () => {
        renderRail();
        expect(counter().textContent).toBe('1 / 3');
        expect(screen.getByText('First alt')).not.toBeNull();
        expect(prev().disabled).toBe(false);
        expect(next().disabled).toBe(false);
    });

    it('arrows step one photo and wrap seamlessly past both ends', () => {
        const { viewport } = renderRail();
        fireEvent.click(next());
        expect(counter().textContent).toBe('2 / 3');
        expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 600, behavior: 'smooth' });
        fireEvent.click(next());
        expect(counter().textContent).toBe('3 / 3');
        expect(prev().disabled).toBe(false);
        expect(next().disabled).toBe(false);
        // Past the last photo: the rail scrolls ONE more position —
        // onto the first photo's clone (position 4), not a rewind
        // through every slide — and the counter already reports
        // the wrapped position.
        fireEvent.click(next());
        expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 1200, behavior: 'smooth' });
        expect(counter().textContent).toBe('1 / 3');
        // Stand in for the completed scroll onto the clone, then
        // let it settle: the rail silently repositions to the real
        // first photo (position 1) — same image, same offset.
        viewport.scrollLeft = 1200;
        fireEvent.scroll(viewport);
        act(() => { viewport.dispatchEvent(new Event('scrollend')); });
        expect(viewport.scrollLeft).toBe(300);
        expect(counter().textContent).toBe('1 / 3');
        // Backwards past the first photo wraps the same way, onto
        // the last photo's clone (position 0) → real position 3.
        fireEvent.click(prev());
        expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' });
        expect(counter().textContent).toBe('3 / 3');
        viewport.scrollLeft = 0;
        fireEvent.scroll(viewport);
        act(() => { viewport.dispatchEvent(new Event('scrollend')); });
        expect(viewport.scrollLeft).toBe(900);
        expect(counter().textContent).toBe('3 / 3');
    });

    it('native scroll position drives the counter and caption, clone positions included', () => {
        const { viewport } = renderRail();
        viewport.scrollLeft = 600;
        fireEvent.scroll(viewport);
        expect(counter().textContent).toBe('2 / 3');
        expect(screen.getByText('Second alt')).not.toBeNull();
        viewport.scrollLeft = 900;
        fireEvent.scroll(viewport);
        expect(counter().textContent).toBe('3 / 3');
        // Sitting on the first photo's clone still reports photo 1…
        viewport.scrollLeft = 1200;
        fireEvent.scroll(viewport);
        expect(counter().textContent).toBe('1 / 3');
        expect(screen.getByText('First alt')).not.toBeNull();
        // …and the last photo's clone reports photo 3.
        viewport.scrollLeft = 0;
        fireEvent.scroll(viewport);
        expect(counter().textContent).toBe('3 / 3');
    });

    it('mouse drag scrolls the rail and swallows the follow-up click', () => {
        const onRootClick = jest.fn();
        const { container } = render(
            <div onClick={onRootClick}>
                <SnapRail
                    images={IMAGES}
                    captionFallback="Fallback title"
                    ariaLabel="Trip photos"
                    counterTestId="rail-counter"
                />
            </div>,
        );
        const vp = container.querySelector('[role="group"]') as HTMLDivElement;
        Object.defineProperty(vp, 'clientWidth', { value: 300, configurable: true });
        vp.scrollTo = jest.fn();
        vp.setPointerCapture = jest.fn();
        vp.scrollLeft = 300;

        act(() => { vp.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', pointerId: 7, clientX: 280 })); });
        act(() => { vp.dispatchEvent(pointer('pointermove', { pointerType: 'mouse', pointerId: 7, clientX: 80 })); });
        // Dragging left by 200px scrolls the rail forward by 200px
        // from its resting position (300).
        expect(vp.scrollLeft).toBe(500);
        act(() => { vp.dispatchEvent(pointer('pointerup', { pointerType: 'mouse', pointerId: 7, clientX: 80 })); });
        // The click the browser fires after the drag is swallowed…
        fireEvent.click(vp);
        expect(onRootClick).not.toHaveBeenCalled();
        // …but a later genuine click is not.
        fireEvent.click(vp);
        expect(onRootClick).toHaveBeenCalledTimes(1);
    });

    it('a press without movement does not suppress the click', () => {
        const onRootClick = jest.fn();
        const { container } = render(
            <div onClick={onRootClick}>
                <SnapRail images={IMAGES} captionFallback="Fallback title" ariaLabel="Trip photos" />
            </div>,
        );
        const vp = container.querySelector('[role="group"]') as HTMLDivElement;
        vp.setPointerCapture = jest.fn();
        act(() => { vp.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', pointerId: 9, clientX: 100 })); });
        act(() => { vp.dispatchEvent(pointer('pointerup', { pointerType: 'mouse', pointerId: 9, clientX: 100 })); });
        fireEvent.click(vp);
        expect(onRootClick).toHaveBeenCalledTimes(1);
    });

    it('dot indicators are real buttons that jump to a photo', () => {
        const { viewport } = renderRail();
        const dot = screen.getByLabelText('View image 3');
        fireEvent.click(dot);
        expect(counter().textContent).toBe('3 / 3');
        expect(dot.getAttribute('aria-current')).toBe('true');
        // Photo 3 rests at extended position 3 (one clone before it).
        expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 900, behavior: 'smooth' });
    });

    describe('dragAdvanceOnRelease (#490 round 3 — wide-slide gallery)', () => {
        const drag = (vp: HTMLDivElement, id: number, from: number, to: number) => {
            act(() => { vp.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', pointerId: id, clientX: from })); });
            act(() => { vp.dispatchEvent(pointer('pointermove', { pointerType: 'mouse', pointerId: id, clientX: to })); });
            act(() => { vp.dispatchEvent(pointer('pointerup', { pointerType: 'mouse', pointerId: id, clientX: to })); });
        };

        it('a card-sized drag (200px) advances the wide rail one slide', () => {
            const { viewport } = renderRail({ dragAdvanceOnRelease: true, showIndicators: false }, 1200);
            drag(viewport, 3, 900, 700);
            // The drag scrolled only 200 of 1200px — native snap would
            // settle back to slide 1 — but the release settles forward
            // onto real photo 2 (extended position 2).
            expect(counter().textContent).toBe('2 / 3');
            expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 2400, behavior: 'smooth' });
        });

        it('a drag back settles on the previous slide', () => {
            const { viewport } = renderRail({ dragAdvanceOnRelease: true, showIndicators: false }, 1200);
            drag(viewport, 3, 900, 700);
            expect(counter().textContent).toBe('2 / 3');
            // jsdom's scrollTo spy does not move scrollLeft; stand in
            // for the completed smooth scroll to photo 2 (position 2).
            viewport.scrollLeft = 2400;
            fireEvent.scroll(viewport);
            drag(viewport, 4, 200, 400);
            expect(counter().textContent).toBe('1 / 3');
            expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 1200, behavior: 'smooth' });
        });

        it('a short drag (< 64px) still settles back', () => {
            const { viewport } = renderRail({ dragAdvanceOnRelease: true, showIndicators: false }, 1200);
            drag(viewport, 5, 900, 870);
            expect(counter().textContent).toBe('1 / 3');
            expect(viewport.scrollTo).not.toHaveBeenCalled();
        });

        it('without the flag the same drag keeps the native settle (cards unchanged)', () => {
            const { viewport } = renderRail({ dragAdvanceOnRelease: false, showIndicators: false }, 1200);
            drag(viewport, 6, 900, 700);
            expect(viewport.scrollLeft).toBe(1400);
            expect(counter().textContent).toBe('1 / 3');
            expect(viewport.scrollTo).not.toHaveBeenCalled();
        });
    });

    describe('snap suspension + touch contract (#490 round 4)', () => {
        /** The round-4 root cause is invisible to position-based
         * tests: jsdom stores scrollLeft as a plain property and has
         * no snap engine, so a mandatory snap container re-snapping
         * scrollLeft mid-drag (what the real browser did, starving
         * every release-time read) cannot be reproduced here. These
         * tests therefore lock the MECHANISM the fix relies on:
         * scroll-snap is suspended for the whole drag, the release
         * decision is made while it is still suspended, and snap
         * returns only when the settle scroll ends. On the pre-fix
         * code the style assertions fail — snap was never suspended
         * at all. */
        it('suspends scroll-snap for the whole drag; the advance settle is issued before snap returns on scrollend', () => {
            const { viewport: vp } = renderRail({ dragAdvanceOnRelease: true, showIndicators: false }, 1200);
            act(() => { vp.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', pointerId: 11, clientX: 900 })); });
            expect(vp.style.scrollSnapType).toBe('none');
            act(() => { vp.dispatchEvent(pointer('pointermove', { pointerType: 'mouse', pointerId: 11, clientX: 600 })); });
            expect(vp.scrollLeft).toBe(1500);
            // Still suspended mid-drag: nothing can re-snap the position
            // back to the start slide behind the handler's back.
            expect(vp.style.scrollSnapType).toBe('none');
            act(() => { vp.dispatchEvent(pointer('pointerup', { pointerType: 'mouse', pointerId: 11, clientX: 600 })); });
            // The release read the true 300px offset and settles forward…
            expect(vp.scrollTo).toHaveBeenLastCalledWith({ left: 2400, behavior: 'smooth' });
            expect(counter().textContent).toBe('2 / 3');
            // …while snap is STILL suspended, so the returning snap
            // engine cannot override the settle mid-flight.
            expect(vp.style.scrollSnapType).toBe('none');
            act(() => { vp.dispatchEvent(new Event('scrollend')); });
            expect(vp.style.scrollSnapType).toBe('');
        });

        it('restores scroll-snap immediately when the drag keeps the native settle', () => {
            const { viewport: vp } = renderRail({ dragAdvanceOnRelease: true, showIndicators: false }, 1200);
            act(() => { vp.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', pointerId: 12, clientX: 900 })); });
            act(() => { vp.dispatchEvent(pointer('pointermove', { pointerType: 'mouse', pointerId: 12, clientX: 870 })); });
            act(() => { vp.dispatchEvent(pointer('pointerup', { pointerType: 'mouse', pointerId: 12, clientX: 870 })); });
            // Sub-threshold drag: no programmatic settle, snap is back
            // at once and the native settle proceeds exactly as before.
            expect(vp.scrollTo).not.toHaveBeenCalled();
            expect(vp.style.scrollSnapType).toBe('');
        });

        it('a press without movement restores scroll-snap', () => {
            const { viewport: vp } = renderRail({ dragAdvanceOnRelease: true, showIndicators: false }, 1200);
            act(() => { vp.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', pointerId: 13, clientX: 100 })); });
            expect(vp.style.scrollSnapType).toBe('none');
            act(() => { vp.dispatchEvent(pointer('pointerup', { pointerType: 'mouse', pointerId: 13, clientX: 100 })); });
            expect(vp.style.scrollSnapType).toBe('');
        });

        it('touch: the viewport permits native horizontal panning and script starts no drag for touch pointers', () => {
            const { viewport: vp } = renderRail({ dragAdvanceOnRelease: true, showIndicators: false }, 1200);
            // touch-action must allow pan-x, or the browser hands
            // horizontal touch gestures to script (which ignores them)
            // and touch drags move nothing — the founder's phone report.
            expect(vp.className).toContain('[touch-action:pan-x_pan-y]');
            expect(vp.className).not.toContain('touch-pan-y');
            act(() => { vp.dispatchEvent(pointer('pointerdown', { pointerType: 'touch', pointerId: 14, clientX: 900 })); });
            act(() => { vp.dispatchEvent(pointer('pointermove', { pointerType: 'touch', pointerId: 14, clientX: 600 })); });
            // No script drag state, no snap suspension: the browser's
            // native pan owns the gesture end to end.
            expect(vp.scrollLeft).toBe(1200);
            expect(vp.style.scrollSnapType).toBe('');
        });
    });

    describe('loop wrap by drag (#490 round 5)', () => {
        it('a native drag settle onto the first photo’s clone reports photo 1 and repositions to the real copy', () => {
            const { viewport } = renderRail();
            // Rest on the last photo (position 3), then a drag the
            // native settle carries onto position 4 (photo 1 clone).
            viewport.scrollLeft = 900;
            fireEvent.scroll(viewport);
            expect(counter().textContent).toBe('3 / 3');
            act(() => { viewport.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', pointerId: 21, clientX: 280 })); });
            act(() => { viewport.dispatchEvent(pointer('pointermove', { pointerType: 'mouse', pointerId: 21, clientX: 80 })); });
            expect(viewport.scrollLeft).toBe(1100);
            act(() => { viewport.dispatchEvent(pointer('pointerup', { pointerType: 'mouse', pointerId: 21, clientX: 80 })); });
            // The scroll settles on the clone: the counter already
            // reports the wrapped photo…
            viewport.scrollLeft = 1200;
            fireEvent.scroll(viewport);
            expect(counter().textContent).toBe('1 / 3');
            // …and once settled, the rail silently repositions to
            // the real first photo.
            act(() => { viewport.dispatchEvent(new Event('scrollend')); });
            expect(viewport.scrollLeft).toBe(300);
            expect(counter().textContent).toBe('1 / 3');
        });
    });
});
