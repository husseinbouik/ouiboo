/**
 * @jest-environment jsdom
 *
 * #624: the desktop trip-page mosaic. Locked behaviour:
 * - up to five photos render as cells; the cover spans 2×2,
 * - clicking a cell reports that photo's index (the host opens the
 *   full-screen viewer there),
 * - fewer photos degrade gracefully (1 photo spans the whole grid).
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TripMosaic } from './TripMosaic';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
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

const FIVE = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'].map((f) => `https://cdn.example.com/${f}`);

describe('TripMosaic (#624)', () => {
  it('renders five cells, cover spanning 2x2, and reports clicks by index', () => {
    const onPhotoClick = jest.fn();
    render(<TripMosaic images={FIVE} captionFallback="Atlas trek" onPhotoClick={onPhotoClick} />);
    const cells = FIVE.map((_, i) => screen.getByLabelText(`View image ${i + 1}`));
    expect(cells).toHaveLength(5);
    expect(cells[0].className).toContain('col-span-2');
    expect(cells[0].className).toContain('row-span-2');
    fireEvent.click(cells[3]);
    expect(onPhotoClick).toHaveBeenCalledWith(3);
  });

  it('shows at most five photos even when the trip has more', () => {
    render(
      <TripMosaic images={[...FIVE, 'https://cdn.example.com/f.jpg']} captionFallback="Atlas trek" onPhotoClick={jest.fn()} />,
    );
    expect(screen.queryByLabelText('View image 6')).toBeNull();
    expect(screen.getByLabelText('View image 5')).not.toBeNull();
  });

  it('degrades cleanly with fewer photos', () => {
    const { rerender } = render(
      <TripMosaic images={FIVE.slice(0, 2)} captionFallback="Atlas trek" onPhotoClick={jest.fn()} />,
    );
    expect(screen.getByLabelText('View image 2')).not.toBeNull();
    expect(screen.queryByLabelText('View image 3')).toBeNull();

    rerender(<TripMosaic images={FIVE.slice(0, 1)} captionFallback="Atlas trek" onPhotoClick={jest.fn()} />);
    const only = screen.getByLabelText('View image 1');
    expect(only.className).toContain('col-span-4');
  });
});
