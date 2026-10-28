import { scrubShareClaimWords } from '@ouiboo/utils';
import { buildTripMetadata, resolveTripCoverImage } from './trip-metadata';
import { SITE_DESCRIPTION, absoluteTravelerUrl } from './site';

describe('buildTripMetadata (#468)', () => {
  it('marks a missing trip as not found and noindex', () => {
    const metadata = buildTripMetadata(null);
    // #576: no manual brand suffix — the root layout template
    // ("%s | Ouiboo") appends it, so the tab reads "Trip not found | Ouiboo".
    expect(metadata.title).toBe('Trip not found');
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
    }, { sharingEnabled: true });

    // #576: page title has no manual suffix (layout template appends
    // "| Ouiboo"); og:/twitter: titles keep the explicit brand suffix.
    expect(metadata.title).toBe('Atlas Hike');
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
    const metadata = buildTripMetadata({ id: 't2', title: 'No Photo', description: 'Desc', images: [] }, { sharingEnabled: true });
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
    }, { sharingEnabled: true });
    expect(metadata.description).toBe('Book Atlas Hike, a 3-day trip from Imlil.');
  });

  it('falls back to the site description when nothing is available', () => {
    const metadata = buildTripMetadata({ id: 't4', title: 'Bare', description: null }, { sharingEnabled: true });
    // Gate-on preview text passes through the B12 claim scrubber; the site
    // description carries no claim words after the #413 sweep, so it comes
    // through unchanged.
    expect(metadata.description).toBe(scrubShareClaimWords(SITE_DESCRIPTION));
  });
});

describe('buildTripMetadata sharing gate (Council B12)', () => {
  const trip = {
    id: 'trip 1',
    title: 'Atlas Hike',
    description: 'A great hike',
    images: ['https://cdn.example.com/a.jpg'],
    durationDays: 3,
    startLocation: 'Imlil',
  };

  it('serves only a generic, claim-free preview while the gate is off', () => {
    const metadata = buildTripMetadata(trip, { sharingEnabled: false });

    // #576: absolute title opts out of the "%s | Ouiboo" layout
    // template — a plain 'Ouiboo' string rendered "Ouiboo | Ouiboo".
    expect(metadata.title).toEqual({ absolute: 'Ouiboo' });
    expect(metadata.description).toBe(SITE_DESCRIPTION);
    expect(metadata.alternates?.canonical).toBe('/trip/trip%201');

    const og = metadata.openGraph as { title?: string; description?: string; images?: unknown };
    expect(og.title).toBe('Ouiboo');
    expect(og.description).toBe(SITE_DESCRIPTION);
    expect(og.images).toBeUndefined();

    const twitter = metadata.twitter as { card?: string; title?: string; images?: unknown };
    expect(twitter.card).toBe('summary');
    expect(twitter.title).toBe('Ouiboo');
    expect(twitter.images).toBeUndefined();

    // No agency-written copy anywhere in the preview.
    expect(JSON.stringify(metadata)).not.toContain('Atlas Hike');
    expect(JSON.stringify(metadata)).not.toContain('cdn.example.com');
  });

  it('defaults to the env flag: off when unset, on when "true"', () => {
    const previous = process.env.NEXT_PUBLIC_SHARING_ENABLED;
    try {
      delete process.env.NEXT_PUBLIC_SHARING_ENABLED;
      expect(buildTripMetadata(trip).title).toEqual({ absolute: 'Ouiboo' });
      process.env.NEXT_PUBLIC_SHARING_ENABLED = 'true';
      expect(buildTripMetadata(trip).title).toBe('Atlas Hike');
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SHARING_ENABLED;
      else process.env.NEXT_PUBLIC_SHARING_ENABLED = previous;
    }
  });

  it('scrubs claim words from agency-written copy in rich previews', () => {
    const metadata = buildTripMetadata(
      {
        id: 't9',
        title: 'Secure Atlas Hike',
        description: 'A guaranteed, protected trek with a verified guide',
        images: [],
      },
      { sharingEnabled: true },
    );
    expect(metadata.title).toBe('Atlas Hike');
    expect(metadata.description).toBe('A trek with a guide');
  });

  describe('B11 beta noindex (Session #3 P0-5, #553)', () => {
    const trip = { id: 't9', title: 'Beta Trip', description: 'Desc', images: [] };

    it('noindexes trip pages in beta mode with sharing on', () => {
      const metadata = buildTripMetadata(trip, { sharingEnabled: true, betaMode: true });
      expect(metadata.robots).toEqual({ index: false, follow: false });
    });

    it('noindexes trip pages in beta mode with sharing off', () => {
      const metadata = buildTripMetadata(trip, { sharingEnabled: false, betaMode: true });
      expect(metadata.robots).toEqual({ index: false, follow: false });
    });

    it('leaves trip pages indexable once beta mode is off', () => {
      const metadata = buildTripMetadata(trip, { sharingEnabled: true, betaMode: false });
      expect(metadata.robots).toBeUndefined();
    });
  });
});

describe('resolveTripCoverImage', () => {
  it('passes absolute URLs through and resolves root-relative ones', () => {
    expect(resolveTripCoverImage({ id: 'x', title: 'X', images: ['https://a.example/i.jpg'] })).toBe(
      'https://a.example/i.jpg',
    );
    expect(resolveTripCoverImage({ id: 'x', title: 'X', images: ['/media/i.jpg'] })).toBe(
      absoluteTravelerUrl('/media/i.jpg'),
    );
  });

  it('skips blanks and drops values that cannot be made absolute', () => {
    expect(resolveTripCoverImage({ id: 'x', title: 'X', images: ['', '  ', 'media/i.jpg'] })).toBeUndefined();
    expect(resolveTripCoverImage({ id: 'x', title: 'X', images: null })).toBeUndefined();
    expect(resolveTripCoverImage({ id: 'x', title: 'X' })).toBeUndefined();
  });
});

describe('buildTripMetadata og:locale (#563 rework)', () => {
  const trip = {
    id: 't-locale',
    title: 'Atlas Hike',
    description: 'A great hike',
    images: ['https://cdn.example.com/a.jpg'],
  };

  it('always sets openGraph.locale + alternateLocale in the rich-preview branch', () => {
    const metadata = buildTripMetadata(trip, { sharingEnabled: true, locale: 'fr' });
    const og = metadata.openGraph as { locale?: string; alternateLocale?: string[] };
    expect(og.locale).toBe('fr_FR');
    expect(og.alternateLocale).toEqual(expect.arrayContaining(['en_US', 'ar_MA']));
    expect(og.alternateLocale).not.toContain('fr_FR');
  });

  it('sets og:locale in the sharing-gated branch too', () => {
    const metadata = buildTripMetadata(trip, { sharingEnabled: false, locale: 'ar' });
    const og = metadata.openGraph as { locale?: string; alternateLocale?: string[] };
    expect(og.locale).toBe('ar_MA');
    expect(og.alternateLocale).toEqual(expect.arrayContaining(['en_US', 'fr_FR']));
  });

  it('sets og:locale for a missing trip and defaults to en_US without a locale', () => {
    const missing = buildTripMetadata(null, { locale: 'fr' });
    const ogMissing = missing.openGraph as { locale?: string; alternateLocale?: string[] };
    expect(ogMissing.locale).toBe('fr_FR');
    expect(ogMissing.alternateLocale).toEqual(expect.arrayContaining(['en_US', 'ar_MA']));

    const fallback = buildTripMetadata(trip, { sharingEnabled: true });
    const ogFallback = fallback.openGraph as { locale?: string };
    expect(ogFallback.locale).toBe('en_US');
  });
});
