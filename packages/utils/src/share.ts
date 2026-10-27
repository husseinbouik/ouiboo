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

const trimTrailingSlashes = (value: string) => {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') end -= 1;
  return value.slice(0, end);
};

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
    // The title is agency-written copy: scrub claim words so a share text
    // cannot carry "verified / secure / guaranteed" language either.
    text: scrubShareClaimWords(buildShareText(params.textTemplate, params.tripTitle)),
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

/**
 * #468 / Council B12: trip sharing is gated OFF by default for the closed
 * beta (sharing as built is public acquisition, not private word-of-mouth).
 * One flag controls both surfaces: NEXT_PUBLIC_SHARING_ENABLED must be the
 * exact string 'true' to enable the share buttons (client) and the rich
 * trip OG/Twitter previews (server metadata). Anything else — unset,
 * 'false', a typo — keeps sharing off. Public launch re-enables it
 * deliberately by setting the flag in both apps.
 */
export function isSharingEnabled(
  value: string | undefined = process.env.NEXT_PUBLIC_SHARING_ENABLED,
): boolean {
  return value === 'true';
}

/**
 * Claim words that must never reach a social preview from agency-written
 * copy (Council B12 scrub list, matching the B10 kill-list): en / fr / ar.
 * Compared lowercase, per whitespace-delimited token, with surrounding
 * punctuation ignored.
 */
const SHARE_CLAIM_WORDS = new Set([
  // en
  'secure', 'secured', 'protected', 'guaranteed', 'guarantee', 'vetted',
  'verified', 'certified', 'trusted',
  // fr
  'sécurisé', 'sécurisée', 'sécurisés', 'sécurisées',
  'protégé', 'protégée', 'protégés', 'protégées',
  'garanti', 'garantie', 'garantis', 'garanties',
  'vérifié', 'vérifiée', 'vérifiés', 'vérifiées',
  'certifié', 'certifiée', 'certifiés', 'certifiées',
  // ar
  'آمن', 'آمنة', 'مضمون', 'مضمونة', 'موثوق', 'موثوقة',
  'معتمد', 'معتمدة', 'محمي', 'محمية',
]);

/**
 * Strip claim words from agency-written text before it is used in a share
 * payload or an OG/Twitter preview, so an agency cannot inject "verified /
 * secure / guaranteed" language into Ouiboo's own preview cards. Token-based
 * (not regex \b) so it behaves the same in Latin and Arabic scripts.
 */
export function scrubShareClaimWords(text: string): string {
  const kept = text
    .split(/\s+/)
    .filter((token) => {
      const core = token
        .replace(/^[^\p{L}\p{N}]+/u, '')
        .replace(/[^\p{L}\p{N}]+$/u, '')
        .toLowerCase();
      if (core.length === 0) return true;
      if (SHARE_CLAIM_WORDS.has(core)) return false;
      // Arabic attaches the conjunction directly (ومضمونة = "and-guaranteed").
      if (core.startsWith('و') && SHARE_CLAIM_WORDS.has(core.slice(1))) return false;
      return true;
    });
  // Join only — no regex tidy-up on the result (CodeQL: polynomial-regex
  // rule). Dropping a token can leave a double space where punctuation was
  // space-separated in the source; collapse literal double spaces instead.
  return kept.join(' ').split('  ').join(' ').trim();
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
