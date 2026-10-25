/**
 * #468: trip sharing helpers.
 *
 * Pure builders for the canonical public trip URL, the share payload and
 * the per-network share-intent URLs, shared by the traveller and agency
 * apps so both produce identical links. The native Web Share API check and
 * the clipboard write are isolated behind tiny wrappers (with injectable
 * dependencies) so the decision logic stays unit-testable.
 */

export type ShareTargetId = 'whatsapp' | 'facebook' | 'x' | 'telegram';

export interface TripSharePayload {
  /** Text shared alongside the link (native sheet `text`, intent `text`). */
  text: string;
  /** Canonical public trip URL, carrying the share source parameter. */
  url: string;
}

export interface ShareTarget {
  id: ShareTargetId;
  intentUrl: string;
}

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

/**
 * Canonical public trip URL on the traveller app: `/trip/{id}` (the same
 * path the trip page's canonical metadata uses) plus the share source
 * parameter, e.g. `https://ouiboo…/trip/abc?src=share`.
 */
export function buildTripShareUrl(
  travelerBaseUrl: string,
  tripId: string,
  source: string = 'share',
): string {
  const base = trimTrailingSlashes(travelerBaseUrl);
  const url = new URL(`${base}/trip/${encodeURIComponent(tripId)}`);
  url.searchParams.set('src', source);
  return url.toString();
}

/** Share text built from the app's translated template (`{{title}}` filled in). */
export function buildShareText(template: string, tripTitle: string): string {
  return template.replace('{{title}}', tripTitle);
}

export function buildSharePayload(params: {
  travelerBaseUrl: string;
  tripId: string;
  tripTitle: string;
  textTemplate: string;
  source?: string;
}): TripSharePayload {
  return {
    text: buildShareText(params.textTemplate, params.tripTitle),
    url: buildTripShareUrl(params.travelerBaseUrl, params.tripId, params.source),
  };
}

export function buildWhatsAppShareUrl(payload: TripSharePayload): string {
  const text = `${payload.text} ${payload.url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildFacebookShareUrl(payload: TripSharePayload): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(payload.url)}`;
}

export function buildXShareUrl(payload: TripSharePayload): string {
  const params = new URLSearchParams({ text: payload.text, url: payload.url });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function buildTelegramShareUrl(payload: TripSharePayload): string {
  const params = new URLSearchParams({ url: payload.url, text: payload.text });
  return `https://t.me/share/url?${params.toString()}`;
}

const INTENT_BUILDERS: Record<ShareTargetId, (payload: TripSharePayload) => string> = {
  whatsapp: buildWhatsAppShareUrl,
  facebook: buildFacebookShareUrl,
  x: buildXShareUrl,
  telegram: buildTelegramShareUrl,
};

/** Ordered fallback-menu targets (WhatsApp first — the dominant channel in Morocco). */
export function getShareTargets(payload: TripSharePayload): ShareTarget[] {
  return (Object.keys(INTENT_BUILDERS) as ShareTargetId[]).map((id) => ({
    id,
    intentUrl: INTENT_BUILDERS[id](payload),
  }));
}

type ShareCapableNavigator = Pick<Navigator, 'share'>;

const defaultNavigator = (): ShareCapableNavigator | undefined =>
  typeof navigator !== 'undefined' ? navigator : undefined;

/**
 * True when the Web Share API is available (mobile browsers / installed
 * PWA). This is also the only path that can reach Instagram — there is no
 * web share-intent for it, so desktop falls back to the menu + copy link.
 */
export function canUseNativeShare(
  nav: ShareCapableNavigator | undefined = defaultNavigator(),
): boolean {
  return typeof nav?.share === 'function';
}

type ClipboardLike = Pick<Clipboard, 'writeText'>;

const defaultClipboard = (): ClipboardLike | undefined =>
  typeof navigator !== 'undefined' ? navigator.clipboard : undefined;

/**
 * Copy-link fallback: writes the URL to the clipboard and reports success
 * so the UI can show its confirmation. Returns false (never throws) when
 * the Clipboard API is unavailable or the write is rejected.
 */
export async function copyShareLink(
  url: string,
  clipboard: ClipboardLike | undefined = defaultClipboard(),
): Promise<boolean> {
  if (!clipboard || typeof clipboard.writeText !== 'function') return false;
  try {
    await clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
