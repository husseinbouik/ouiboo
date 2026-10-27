import {
  buildFacebookShareUrl,
  buildSharePayload,
  buildShareText,
  buildTelegramShareUrl,
  buildTripShareUrl,
  buildWhatsAppShareUrl,
  buildXShareUrl,
  canUseNativeShare,
  copyShareLink,
  getShareTargets,
  isLocalhostUrl,
  isSharingEnabled,
  resolveShareBaseUrl,
  scrubShareClaimWords,
} from './share';

describe('trip share helpers (#468)', () => {
  describe('buildTripShareUrl', () => {
    it('builds the canonical trip URL with the default share source', () => {
      expect(buildTripShareUrl('https://traveler.example.com', 'trip-1')).toBe(
        'https://traveler.example.com/trip/trip-1?src=share',
      );
    });

    it('accepts a custom source (agency shares)', () => {
      expect(buildTripShareUrl('https://traveler.example.com', 'trip-1', 'agency-share')).toBe(
        'https://traveler.example.com/trip/trip-1?src=agency-share',
      );
    });

    it('trims trailing slashes on the base URL and encodes the trip id', () => {
      expect(buildTripShareUrl('https://traveler.example.com///', 'a b/c')).toBe(
        'https://traveler.example.com/trip/a%20b%2Fc?src=share',
      );
    });
  });

  describe('buildShareText / buildSharePayload', () => {
    it('fills the {{title}} placeholder of the translated template', () => {
      expect(buildShareText('Check out this trip on Ouiboo: {{title}}', 'Sahara Trek')).toBe(
        'Check out this trip on Ouiboo: Sahara Trek',
      );
    });

    it('combines text and URL into the payload', () => {
      expect(
        buildSharePayload({
          travelerBaseUrl: 'https://traveler.example.com/',
          tripId: 'trip-9',
          tripTitle: 'Sahara Trek',
          textTemplate: 'Trip: {{title}}',
        }),
      ).toEqual({
        text: 'Trip: Sahara Trek',
        url: 'https://traveler.example.com/trip/trip-9?src=share',
      });
    });
  });

  describe('share intent URLs', () => {
    const payload = { text: 'Trip: Sahara Trek', url: 'https://t.example/trip/trip-9?src=share' };

    it('WhatsApp carries text + URL in one encoded message', () => {
      const url = new URL(buildWhatsAppShareUrl(payload));
      expect(url.origin + url.pathname).toBe('https://wa.me/');
      expect(url.searchParams.get('text')).toBe('Trip: Sahara Trek https://t.example/trip/trip-9?src=share');
    });

    it('Facebook carries only the shared URL', () => {
      const url = new URL(buildFacebookShareUrl(payload));
      expect(url.origin + url.pathname).toBe('https://www.facebook.com/sharer/sharer.php');
      expect(url.searchParams.get('u')).toBe(payload.url);
    });

    it('X carries text and URL as separate params', () => {
      const url = new URL(buildXShareUrl(payload));
      expect(url.origin + url.pathname).toBe('https://twitter.com/intent/tweet');
      expect(url.searchParams.get('text')).toBe(payload.text);
      expect(url.searchParams.get('url')).toBe(payload.url);
    });

    it('Telegram carries URL and text', () => {
      const url = new URL(buildTelegramShareUrl(payload));
      expect(url.origin + url.pathname).toBe('https://t.me/share/url');
      expect(url.searchParams.get('url')).toBe(payload.url);
      expect(url.searchParams.get('text')).toBe(payload.text);
    });

    it('getShareTargets returns the four networks in menu order', () => {
      const targets = getShareTargets(payload);
      expect(targets.map((target) => target.id)).toEqual(['whatsapp', 'facebook', 'x', 'telegram']);
      expect(targets[0].intentUrl).toBe(buildWhatsAppShareUrl(payload));
      expect(targets[3].intentUrl).toBe(buildTelegramShareUrl(payload));
    });
  });

  describe('canUseNativeShare', () => {
    it('is true only when navigator.share is a function', () => {
      expect(canUseNativeShare({ share: () => Promise.resolve() } as unknown as Navigator)).toBe(true);
      expect(canUseNativeShare({} as unknown as Navigator)).toBe(false);
      expect(canUseNativeShare(undefined)).toBe(false);
    });
  });

  describe('copyShareLink fallback', () => {
    it('writes the URL and reports success', async () => {
      const writeText = jest.fn().mockResolvedValue(undefined);
      await expect(copyShareLink('https://t.example/trip/1', { writeText })).resolves.toBe(true);
      expect(writeText).toHaveBeenCalledWith('https://t.example/trip/1');
    });

    it('reports failure without throwing when the clipboard is missing', async () => {
      await expect(copyShareLink('https://t.example/trip/1', undefined)).resolves.toBe(false);
      await expect(
        copyShareLink('https://t.example/trip/1', {} as unknown as Clipboard),
      ).resolves.toBe(false);
    });

    it('reports failure without throwing when the write is rejected', async () => {
      const writeText = jest.fn().mockRejectedValue(new Error('denied'));
      await expect(copyShareLink('https://t.example/trip/1', { writeText })).resolves.toBe(false);
    });
  });

  describe('isSharingEnabled (Council B12 gate)', () => {
    it('is true only for the exact string "true"', () => {
      expect(isSharingEnabled('true')).toBe(true);
      expect(isSharingEnabled('false')).toBe(false);
      expect(isSharingEnabled('TRUE')).toBe(false);
      expect(isSharingEnabled('1')).toBe(false);
      expect(isSharingEnabled('')).toBe(false);
      expect(isSharingEnabled(undefined)).toBe(false);
    });

    it('defaults to the NEXT_PUBLIC_SHARING_ENABLED env var', () => {
      const previous = process.env.NEXT_PUBLIC_SHARING_ENABLED;
      try {
        delete process.env.NEXT_PUBLIC_SHARING_ENABLED;
        expect(isSharingEnabled()).toBe(false);
        process.env.NEXT_PUBLIC_SHARING_ENABLED = 'true';
        expect(isSharingEnabled()).toBe(true);
      } finally {
        if (previous === undefined) delete process.env.NEXT_PUBLIC_SHARING_ENABLED;
        else process.env.NEXT_PUBLIC_SHARING_ENABLED = previous;
      }
    });
  });

  describe('isLocalhostUrl', () => {
    it('detects loopback hosts', () => {
      expect(isLocalhostUrl('http://localhost:3001')).toBe(true);
      expect(isLocalhostUrl('http://127.0.0.1:3001')).toBe(true);
      expect(isLocalhostUrl('http://[::1]:3001')).toBe(true);
    });

    it('accepts public hosts and survives unparseable values', () => {
      expect(isLocalhostUrl('https://ouiboo-traveler-staging.vercel.app')).toBe(false);
      expect(isLocalhostUrl('https://localhost.example.com')).toBe(false);
      expect(isLocalhostUrl('not a url')).toBe(false);
    });
  });

  describe('resolveShareBaseUrl (localhost leak guard, #468)', () => {
    const DEPLOYED = 'https://ouiboo-traveler-staging.vercel.app';

    it('prefers a configured public base over the runtime origin', () => {
      expect(
        resolveShareBaseUrl('https://traveler.example.com/', {
          runtimeOrigin: DEPLOYED,
          allowRuntimeOriginFallback: true,
        }),
      ).toBe('https://traveler.example.com');
    });

    it('falls back to the runtime origin in the traveller app when the configured base is loopback', () => {
      expect(
        resolveShareBaseUrl('http://localhost:3001', {
          runtimeOrigin: DEPLOYED,
          allowRuntimeOriginFallback: true,
        }),
      ).toBe(DEPLOYED);
    });

    it('returns null in the agency app instead of leaking localhost or the agency origin', () => {
      expect(
        resolveShareBaseUrl('http://localhost:3001', {
          runtimeOrigin: 'https://ouiboo-agency-staging.vercel.app',
        }),
      ).toBeNull();
      expect(resolveShareBaseUrl('', { runtimeOrigin: DEPLOYED })).toBeNull();
    });

    it('keeps the loopback base in true local development (page served from loopback)', () => {
      expect(
        resolveShareBaseUrl('http://localhost:3001', {
          runtimeOrigin: 'http://localhost:3001',
          allowRuntimeOriginFallback: true,
        }),
      ).toBe('http://localhost:3001');
    });

    it('uses the configured value when no runtime origin is known (SSR)', () => {
      expect(resolveShareBaseUrl('http://localhost:3001')).toBe('http://localhost:3001');
      expect(resolveShareBaseUrl('')).toBeNull();
    });

    it('a deployed-configuration payload never contains localhost', () => {
      const base = resolveShareBaseUrl('http://localhost:3001', {
        runtimeOrigin: DEPLOYED,
        allowRuntimeOriginFallback: true,
      });
      const payload = buildSharePayload({
        travelerBaseUrl: base ?? '',
        tripId: 'trip-1',
        tripTitle: 'Sahara Trek',
        textTemplate: 'Trip: {{title}}',
      });
      expect(payload.url).toBe(`${DEPLOYED}/trip/trip-1?src=share`);
      expect(payload.url).not.toContain('localhost');
    });
  });

  describe('scrubShareClaimWords (Council B12 OG scrub)', () => {
    it('strips English claim words and tidies punctuation', () => {
      expect(scrubShareClaimWords('Secure Sahara Trek, guaranteed fun!')).toBe('Sahara Trek, fun!');
      expect(scrubShareClaimWords('A verified agency offers protected booking')).toBe(
        'A agency offers booking',
      );
    });

    it('strips French and Arabic claim words', () => {
      expect(scrubShareClaimWords('Voyage sécurisé et garanti au départ de Tanger')).toBe(
        'Voyage et au départ de Tanger',
      );
      expect(scrubShareClaimWords('رحلة آمنة ومضمونة إلى الصحراء')).toBe('رحلة إلى الصحراء');
    });

    it('leaves claim-free copy untouched', () => {
      expect(scrubShareClaimWords('Sunset camel trek in Merzouga')).toBe(
        'Sunset camel trek in Merzouga',
      );
    });
  });
});
