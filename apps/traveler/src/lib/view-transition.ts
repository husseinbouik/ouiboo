/**
 * #488: shared-element view transitions for trip navigation.
 *
 * The trip card cover and the trip detail hero are the same photo; both
 * sides render it with this `viewTransitionName`, and globals.css opts
 * into view transitions (`@view-transition { navigation: auto }` plus
 * the ::view-transition rules), so a supporting browser morphs the card
 * image into the hero on navigation. Browsers without View Transitions
 * support ignore the name entirely — navigation behaves exactly as
 * before. `prefers-reduced-motion` disables the morph in globals.css.
 * (This Next version exposes no `experimental.viewTransition` config
 * key — verified against its installed types — so the pairing is pure
 * CSS + inline style, with no config surface to break.)
 *
 * The name must be a valid CSS custom identifier: trip ids are UUIDs /
 * slugs, but anything non-alphanumeric is collapsed to '-' defensively.
 */
export function tripCoverViewTransitionName(tripId: string): string {
  const safe = tripId.replace(/[^a-zA-Z0-9_-]/g, '-');
  return `trip-cover-${safe}`;
}
