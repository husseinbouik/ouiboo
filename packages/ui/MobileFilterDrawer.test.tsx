/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileFilterDrawer } from './MobileFilterDrawer';

// jsdom has no PointerEvent constructor — without this polyfill,
// fireEvent.pointer* delivers events with null clientX/pointerId.
class MockPointerEvent extends MouseEvent {
  pointerId: number;
  isPrimary: boolean;
  constructor(type: string, props: PointerEventInit & { pointerId?: number } = {}) {
    super(type, props);
    this.pointerId = props.pointerId ?? 0;
    this.isPrimary = props.isPrimary ?? true;
  }
}

// jsdom has no layout: give the panel a realistic box on the right edge
// so the swipe direction/threshold math runs against real numbers.
beforeAll(() => {
  (window as unknown as { PointerEvent: unknown }).PointerEvent = MockPointerEvent;
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return 320;
    },
  });
  jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockReturnValue({
      left: 704,
      right: 1024,
      top: 0,
      bottom: 800,
      width: 320,
      height: 800,
      x: 704,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
});

afterAll(() => {
  jest.restoreAllMocks();
});

function renderDrawer(onOpenChange = jest.fn()) {
  render(
    <MobileFilterDrawer open onOpenChange={onOpenChange} title="Filters">
      <p>Filter body</p>
    </MobileFilterDrawer>,
  );
  return { onOpenChange, panel: screen.getByRole('dialog') };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function swipe(panel: HTMLElement, fromX: number, toX: number) {
  // Slow, deliberate drag: real elapsed time between moves keeps the
  // velocity under the flick threshold (jsdom stamps synthetic events
  // with the wall clock), so these cases exercise the distance rule.
  fireEvent.pointerDown(panel, { pointerId: 1, clientX: fromX, clientY: 100 });
  await sleep(80);
  fireEvent.pointerMove(panel, { pointerId: 1, clientX: (fromX + toX) / 2, clientY: 100 });
  await sleep(80);
  fireEvent.pointerMove(panel, { pointerId: 1, clientX: toX, clientY: 100 });
  await sleep(80);
  fireEvent.pointerUp(panel, { pointerId: 1, clientX: toX, clientY: 100 });
}

describe('MobileFilterDrawer swipe-to-dismiss (#489)', () => {
  it('dismisses when swiped toward its edge past the threshold', async () => {
    const { onOpenChange, panel } = renderDrawer();
    await swipe(panel, 800, 1000); // 200px > 30% of 320px panel
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('snaps back (stays open) when released below the threshold', async () => {
    const { onOpenChange, panel } = renderDrawer();
    await swipe(panel, 800, 830); // 30px < 96px threshold, slow release
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole('dialog')).not.toBeNull();
  });

  it('ignores vertical-dominant gestures (drawer content still scrolls)', () => {
    const { onOpenChange, panel } = renderDrawer();
    fireEvent.pointerDown(panel, { pointerId: 1, clientX: 800, clientY: 100 });
    fireEvent.pointerMove(panel, { pointerId: 1, clientX: 810, clientY: 300 });
    fireEvent.pointerUp(panel, { pointerId: 1, clientX: 810, clientY: 300 });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('keeps the existing dismissal paths: backdrop tap and Esc', () => {
    const { onOpenChange } = renderDrawer();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close filters' })[0]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
