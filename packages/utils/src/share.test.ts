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
});
