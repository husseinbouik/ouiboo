/**
 * #486: blur-up placeholders for trip images (BlurHash-style).
 *
 * Two tiers, cheapest first:
 * 1. A stored per-image placeholder — when the API media record carries
 *    one (`blurDataUrl` on the trip payload, index-aligned with
 *    `images`), it is passed straight to next/image as `blurDataURL`.
 *    Generation happens once at agency upload time on the API side,
 *    never per-request; until that column exists the field is simply
 *    absent and tier 2 applies (null-safe by construction).
 * 2. A built-in palette placeholder — a tiny (8x5) blurred SVG data-URL
 *    in the shared brand palette (deep blue #0A192F → sand). It costs
 *    ~200 bytes inline, needs no network, and guarantees every trip
 *    image blurs up instead of popping in, including all existing media
 *    that has no stored placeholder.
 */

/** Tiny blurred brand-palette SVG used when no stored placeholder exists. */
export const FALLBACK_BLUR_DATA_URL =
  'data:image/svg+xml;base64,' +
  (typeof btoa !== 'undefined'
    ? btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="5"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0A192F"/><stop offset="0.55" stop-color="#5b7a99"/><stop offset="1" stop-color="#e8dcc8"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="2"/></filter></defs><rect width="8" height="5" fill="url(#g)" filter="url(#b)"/></svg>',
      )
    : '')

/**
 * Resolve the blurDataURL for the image at `index`: the stored
 * placeholder when the payload carries a non-empty one for that index,
 * otherwise the palette fallback. Always returns a usable data-URL so
 * callers can unconditionally use `placeholder="blur"`.
 */
export function resolveBlurDataURL(
  stored: readonly (string | null | undefined)[] | string | null | undefined,
  index = 0,
): string {
  const candidate = Array.isArray(stored) ? stored[index] : stored
  return candidate && candidate.startsWith('data:') ? candidate : FALLBACK_BLUR_DATA_URL
}
