/**
 * @jest-environment jsdom
 *
 * #490 round 2: the shared Snap Rail (trip-page gallery + cards)
 * locked behaviour:
 * - counter + caption are always rendered,
 * - arrows DISABLE at the ends — there is no loop (the old card
 *   carousel wrapped from the last photo back to the first),
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

function renderRail() {
    const utils = render(
        <SnapRail
            images={IMAGES}
            imageAlts={['First alt', 'Second alt', 'Third alt']}
            captionFallback="Fallback title"
            ariaLabel="Trip photos"
            counterTestId="rail-counter"
            showIndicators
        />,
    );
    const viewport = utils.container.querySelector('[role="group"]') as HTMLDivElement;
    // jsdom has no layout: give the viewport a width and a scrollTo spy.
    Object.defineProperty(viewport, 'clientWidth', { value: 300, configurable: true });
    viewport.scrollTo = jest.fn();
    return { ...utils, viewport };
}

const prev = () => screen.getByLabelText('tripCard.previousImage') as HTMLButtonElement;
const next = () => screen.getByLabelText('tripCard.nextImage') as HTMLButtonElement;
const counter = () => screen.getByTestId('rail-counter');

describe('SnapRail (#490 round 2)', () => {
    it('renders counter + caption and starts with prev disabled, next enabled', () => {
        renderRail();
        expect(counter().textContent).toBe('1 / 3');
        expect(screen.getByText('First alt')).not.toBeNull();
        expect(prev().disabled).toBe(true);
        expect(next().disabled).toBe(false);
    });

    it('arrows advance without looping: next disables on the last photo', () => {
        const { viewport } = renderRail();
        fireEvent.click(next());
        expect(counter().textContent).toBe('2 / 3');
        expect(prev().disabled).toBe(false);
        fireEvent.click(next());
        expect(counter().textContent).toBe('3 / 3');
        expect(next().disabled).toBe(true);
        // No loop: a further (forced) click stays on the last photo.
        fireEvent.click(next());
        expect(counter().textContent).toBe('3 / 3');
        expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 600, behavior: 'smooth' });
        fireEvent.click(prev());
        expect(counter().textContent).toBe('2 / 3');
    });

    it('native scroll position drives the counter and caption (touch swipe path)', () => {
        const { viewport } = renderRail();
        viewport.scrollLeft = 300;
        fireEvent.scroll(viewport);
        expect(counter().textContent).toBe('2 / 3');
        expect(screen.getByText('Second alt')).not.toBeNull();
        viewport.scrollLeft = 900;
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

        act(() => { vp.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', pointerId: 7, clientX: 280 })); });
        act(() => { vp.dispatchEvent(pointer('pointermove', { pointerType: 'mouse', pointerId: 7, clientX: 80 })); });
        // Dragging left by 200px scrolls the rail forward by 200px.
        expect(vp.scrollLeft).toBe(200);
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
        renderRail();
        const dot = screen.getByLabelText('View image 3');
        fireEvent.click(dot);
        expect(counter().textContent).toBe('3 / 3');
        expect(dot.getAttribute('aria-current')).toBe('true');
    });

    describe('dragAdvanceOnRelease (#490 round 3 — wide-slide gallery)', () => {
        function renderWideRail(withFlag: boolean) {
            const utils = render(
                <SnapRail
                    images={IMAGES}
                    imageAlts={['First alt', 'Second alt', 'Third alt']}
                    captionFallback="Fallback title"
                    ariaLabel="Trip photos"
                    counterTestId="rail-counter"
                    dragAdvanceOnRelease={withFlag}
                />,
            );
            const vp = utils.container.querySelector('[role="group"]') as HTMLDivElement;
            // Gallery geometry: a slide is a full page width, ~3x a card.
            Object.defineProperty(vp, 'clientWidth', { value: 1200, configurable: true });
            vp.scrollTo = jest.fn();
            vp.setPointerCapture = jest.fn();
            return { ...utils, vp };
        }

        const drag = (vp: HTMLDivElement, id: number, from: number, to: number) => {
            act(() => { vp.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', pointerId: id, clientX: from })); });
            act(() => { vp.dispatchEvent(pointer('pointermove', { pointerType: 'mouse', pointerId: id, clientX: to })); });
            act(() => { vp.dispatchEvent(pointer('pointerup', { pointerType: 'mouse', pointerId: id, clientX: to })); });
        };

        it('a card-sized drag (200px) advances the wide rail one slide', () => {
            const { vp } = renderWideRail(true);
            drag(vp, 3, 900, 700);
            // The drag scrolled only 200 of 1200px — native snap would
            // settle back to slide 1 — but the release settles forward.
            expect(counter().textContent).toBe('2 / 3');
            expect(vp.scrollTo).toHaveBeenLastCalledWith({ left: 1200, behavior: 'smooth' });
        });

        it('a drag back settles on the previous slide', () => {
            const { vp } = renderWideRail(true);
            drag(vp, 3, 900, 700);
            expect(counter().textContent).toBe('2 / 3');
            // jsdom's scrollTo spy does not move scrollLeft; stand in
            // for the completed smooth scroll to slide 2.
            vp.scrollLeft = 1200;
            drag(vp, 4, 200, 400);
            expect(counter().textContent).toBe('1 / 3');
            expect(vp.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' });
        });

        it('a short drag (< 64px) still settles back', () => {
            const { vp } = renderWideRail(true);
            drag(vp, 5, 900, 870);
            expect(counter().textContent).toBe('1 / 3');
            expect(vp.scrollTo).not.toHaveBeenCalled();
        });

        it('without the flag the same drag keeps the native settle (cards unchanged)', () => {
            const { vp } = renderWideRail(false);
            drag(vp, 6, 900, 700);
            expect(vp.scrollLeft).toBe(200);
            expect(counter().textContent).toBe('1 / 3');
            expect(vp.scrollTo).not.toHaveBeenCalled();
        });
    });
});

describe('SnapRail (#490 round 4 — snap suspension + touch contract)', () => {
    /** The round-4 root cause is invisible to the tests above: jsdom
     * stores scrollLeft as a plain property and has no snap engine,
     * so a mandatory snap container re-snapping scrollLeft mid-drag
     * (what the real browser did, starving every release-time read)
     * cannot be reproduced here. These tests therefore lock the
     * MECHANISM the fix relies on: scroll-snap is suspended for the
     * whole drag, the release decision is made while it is still
     * suspended, and snap returns only when the settle scroll ends.
     * On the pre-fix code the style assertions fail — snap was never
     * suspended at all. */
    function renderWideRail(withFlag: boolean) {
        const utils = render(
            <SnapRail
                images={IMAGES}
                imageAlts={['First alt', 'Second alt', 'Third alt']}
                captionFallback="Fallback title"
                ariaLabel="Trip photos"
                counterTestId="rail-counter"
                dragAdvanceOnRelease={withFlag}
            />,
        );
        const vp = utils.container.querySelector('[role="group"]') as HTMLDivElement;
        Object.defineProperty(vp, 'clientWidth', { value: 1200, configurable: true });
        vp.scrollTo = jest.fn();
        vp.setPointerCapture = jest.fn();
        return { ...utils, vp };
    }

    it('suspends scroll-snap for the whole drag; the advance settle is issued before snap returns on scrollend', () => {
        const { vp } = renderWideRail(true);
        act(() => { vp.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', pointerId: 11, clientX: 900 })); });
        expect(vp.style.scrollSnapType).toBe('none');
        act(() => { vp.dispatchEvent(pointer('pointermove', { pointerType: 'mouse', pointerId: 11, clientX: 600 })); });
        expect(vp.scrollLeft).toBe(300);
        // Still suspended mid-drag: nothing can re-snap the position
        // back to the start slide behind the handler's back.
        expect(vp.style.scrollSnapType).toBe('none');
        act(() => { vp.dispatchEvent(pointer('pointerup', { pointerType: 'mouse', pointerId: 11, clientX: 600 })); });
        // The release read the true 300px offset and settles forward…
        expect(vp.scrollTo).toHaveBeenLastCalledWith({ left: 1200, behavior: 'smooth' });
        expect(counter().textContent).toBe('2 / 3');
        // …while snap is STILL suspended, so the returning snap
        // engine cannot override the settle mid-flight.
        expect(vp.style.scrollSnapType).toBe('none');
        act(() => { vp.dispatchEvent(new Event('scrollend')); });
        expect(vp.style.scrollSnapType).toBe('');
    });

    it('restores scroll-snap immediately when the drag keeps the native settle', () => {
        const { vp } = renderWideRail(true);
        act(() => { vp.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', pointerId: 12, clientX: 900 })); });
        act(() => { vp.dispatchEvent(pointer('pointermove', { pointerType: 'mouse', pointerId: 12, clientX: 870 })); });
        act(() => { vp.dispatchEvent(pointer('pointerup', { pointerType: 'mouse', pointerId: 12, clientX: 870 })); });
        // Sub-threshold drag: no programmatic settle, snap is back
        // at once and the native settle proceeds exactly as before.
        expect(vp.scrollTo).not.toHaveBeenCalled();
        expect(vp.style.scrollSnapType).toBe('');
    });

    it('a press without movement restores scroll-snap', () => {
        const { vp } = renderWideRail(true);
        act(() => { vp.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', pointerId: 13, clientX: 100 })); });
        expect(vp.style.scrollSnapType).toBe('none');
        act(() => { vp.dispatchEvent(pointer('pointerup', { pointerType: 'mouse', pointerId: 13, clientX: 100 })); });
        expect(vp.style.scrollSnapType).toBe('');
    });

    it('touch: the viewport permits native horizontal panning and script starts no drag for touch pointers', () => {
        const { vp } = renderWideRail(true);
        // touch-action must allow pan-x, or the browser hands
        // horizontal touch gestures to script (which ignores them)
        // and touch drags move nothing — the founder's phone report.
        expect(vp.className).toContain('[touch-action:pan-x_pan-y]');
        expect(vp.className).not.toContain('touch-pan-y');
        act(() => { vp.dispatchEvent(pointer('pointerdown', { pointerType: 'touch', pointerId: 14, clientX: 900 })); });
        act(() => { vp.dispatchEvent(pointer('pointermove', { pointerType: 'touch', pointerId: 14, clientX: 600 })); });
        // No script drag state, no snap suspension: the browser's
        // native pan owns the gesture end to end.
        expect(vp.scrollLeft).toBe(0);
        expect(vp.style.scrollSnapType).toBe('');
    });
});
