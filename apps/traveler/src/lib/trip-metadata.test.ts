import { buildTripMetadata, resolveTripCoverImage } from './trip-metadata';
import { SITE_DESCRIPTION } from './site';

describe('buildTripMetadata (#468)', () => {
  it('marks a missing trip as not found and noindex', () => {
    const metadata = buildTripMetadata(null);
    expect(metadata.title).toBe('Trip not found — Ouiboo');
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('builds full OG/Twitter metadata with the absolute cover image', () => {
    const metadata = buildTripMetadata({
      id: 'trip 1',
      title: 'Atlas Hike',
      description: '  A   great\n hike  ',
      images: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'],
      durationDays: 3,
      startLocation: 'Imlil',
    });

    expect(metadata.title).toBe('Atlas Hike — Ouiboo');
    expect(metadata.description).toBe('A great hike');
    expect(metadata.alternates?.canonical).toBe('/trip/trip%201');

    const og = metadata.openGraph as {
      title?: string;
      description?: string;
      url?: string;
      images?: { url: string; alt?: string }[];
    };
    expect(og.title).toBe('Atlas Hike — Ouiboo');
    expect(og.description).toBe('A great hike');
    expect(og.url).toBe('/trip/trip%201');
    // Only the cover (first) image, absolute — scrapers ignore relative URLs.
    expect(og.images).toEqual([{ url: 'https://cdn.example.com/a.jpg', alt: 'Atlas Hike' }]);

    const twitter = metadata.twitter as {
      card?: string;
      title?: string;
      images?: string[];
    };
    expect(twitter.card).toBe('summary_large_image');
    expect(twitter.title).toBe('Atlas Hike — Ouiboo');
    expect(twitter.images).toEqual(['https://cdn.example.com/a.jpg']);
  });

  it('omits images when the trip has none, but keeps the large-image card', () => {
    const metadata = buildTripMetadata({ id: 't2', title: 'No Photo', description: 'Desc', images: [] });
    const og = metadata.openGraph as { images?: unknown };
    const twitter = metadata.twitter as { card?: string; images?: unknown };
    expect(og.images).toBeUndefined();
    expect(twitter.card).toBe('summary_large_image');
    expect(twitter.images).toBeUndefined();
  });

  it('falls back to a duration/location description when none is stored', () => {
    const metadata = buildTripMetadata({
      id: 't3',
      title: 'Atlas Hike',
      description: '   ',
      durationDays: 3,
      startLocation: 'Imlil',
    });
    expect(metadata.description).toBe('Book Atlas Hike, a 3-day trip from Imlil.');
  });

  it('falls back to the site description when nothing is available', () => {
    const metadata = buildTripMetadata({ id: 't4', title: 'Bare', description: null });
    expect(metadata.description).toBe(SITE_DESCRIPTION);
  });
});

describe('resolveTripCoverImage', () => {
  it('passes absolute URLs through and resolves root-relative ones', () => {
    expect(resolveTripCoverImage({ id: 'x', title: 'X', images: ['https://a.example/i.jpg'] })).toBe(
      'https://a.example/i.jpg',
    );
    expect(resolveTripCoverImage({ id: 'x', title: 'X', images: ['/media/i.jpg'] })).toBe(
      'http://localhost:3001/media/i.jpg',
    );
  });

  it('skips blanks and drops values that cannot be made absolute', () => {
    expect(resolveTripCoverImage({ id: 'x', title: 'X', images: ['', '  ', 'media/i.jpg'] })).toBeUndefined();
    expect(resolveTripCoverImage({ id: 'x', title: 'X', images: null })).toBeUndefined();
    expect(resolveTripCoverImage({ id: 'x', title: 'X' })).toBeUndefined();
  });
});
