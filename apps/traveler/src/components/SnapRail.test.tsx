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
});
