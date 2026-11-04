/**
 * @jest-environment jsdom
 *
 * #623: the full-screen photo viewer. Locked behaviour:
 * - opens AT the tapped photo (counter reports initialIndex),
 * - the filmstrip jumps straight to any photo (the rail follows
 *   through its externalIndex jump and the counter tracks),
 * - arrow keys step and wrap around the ends (loop),
 * - Escape closes, and focus lands on the close button on open.
 *
 * jsdom has no layout (clientWidth 0), so the rail's scroll calls
 * are stubbed on the prototype; the counter updates synchronously
 * through the same setActive path the scroll handler uses live.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PhotoViewer } from './PhotoViewer';

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

const IMAGES = [
  'https://cdn.example.com/a.jpg',
  'https://cdn.example.com/b.jpg',
  'https://cdn.example.com/c.jpg',
];

beforeAll(() => {
  // jsdom does not implement element scrollTo; the rail calls it on
  // the jump path (its state updates land regardless).
  (window.HTMLElement.prototype as any).scrollTo = jest.fn();
  // #663: the filmstrip follow effect calls scrollIntoView on the
  // active thumbnail; jsdom does not implement it.
  (window.HTMLElement.prototype as any).scrollIntoView = jest.fn();
});

beforeEach(() => {
  ((window.HTMLElement.prototype as any).scrollIntoView as jest.Mock).mockClear();
});

describe('PhotoViewer (#623)', () => {
  it('opens at the tapped photo with counter + caption', () => {
    render(
      <PhotoViewer images={IMAGES} captionFallback="Atlas trek" initialIndex={1} onClose={jest.fn()} />,
    );
    expect(screen.getByTestId('photo-viewer')).not.toBeNull();
    expect(screen.getByTestId('photo-viewer-counter').textContent).toBe('2 / 3');
    expect(screen.getByText('Atlas trek')).not.toBeNull();
  });

  it('filmstrip click jumps straight to that photo', () => {
    render(
      <PhotoViewer images={IMAGES} captionFallback="Atlas trek" initialIndex={0} onClose={jest.fn()} />,
    );
    const thumb = screen.getByLabelText('View image 3');
    fireEvent.click(thumb);
    expect(screen.getByTestId('photo-viewer-counter').textContent).toBe('3 / 3');
    expect(thumb.getAttribute('aria-current')).toBe('true');
  });

  it('arrow keys step and wrap around the end', () => {
    render(
      <PhotoViewer images={IMAGES} captionFallback="Atlas trek" initialIndex={2} onClose={jest.fn()} />,
    );
    expect(screen.getByTestId('photo-viewer-counter').textContent).toBe('3 / 3');
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByTestId('photo-viewer-counter').textContent).toBe('1 / 3');
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(screen.getByTestId('photo-viewer-counter').textContent).toBe('3 / 3');
  });

  it('Escape closes and focus starts on the close button', () => {
    const onClose = jest.fn();
    render(
      <PhotoViewer images={IMAGES} captionFallback="Atlas trek" initialIndex={0} onClose={onClose} />,
    );
    expect(document.activeElement).toBe(screen.getByLabelText('common.closeDialog'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('#663: the filmstrip scrolls the active thumbnail into view on index change', () => {
    render(
      <PhotoViewer images={IMAGES} captionFallback="Atlas trek" initialIndex={0} onClose={jest.fn()} />,
    );
    const scrollIntoView = (window.HTMLElement.prototype as any).scrollIntoView as jest.Mock;
    // Opening scrolls the initially-active thumbnail into view.
    expect(scrollIntoView).toHaveBeenCalled();
    scrollIntoView.mockClear();
    // Stepping with the keyboard moves the active thumb; the strip follows.
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByTestId('photo-viewer-counter').textContent).toBe('2 / 3');
    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ inline: 'center', block: 'nearest' }),
    );
    const activeThumb = screen.getByLabelText('View image 2');
    expect(scrollIntoView.mock.instances).toContain(activeThumb);
  });

  it('#663: the viewer chrome carries safe-area insets', () => {
    render(
      <PhotoViewer images={IMAGES} captionFallback="Atlas trek" initialIndex={0} onClose={jest.fn()} />,
    );
    const viewer = screen.getByTestId('photo-viewer');
    expect(viewer.className).toContain('pt-[env(safe-area-inset-top)]');
    expect(viewer.className).toContain('pb-[env(safe-area-inset-bottom)]');
    expect(viewer.className).toContain('ps-[env(safe-area-inset-left)]');
    expect(viewer.className).toContain('pe-[env(safe-area-inset-right)]');
  });

  it('locks body scroll while open and restores it on unmount', () => {
    const { unmount } = render(
      <PhotoViewer images={IMAGES} captionFallback="Atlas trek" initialIndex={0} onClose={jest.fn()} />,
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
