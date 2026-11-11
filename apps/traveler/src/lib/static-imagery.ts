/**
 * Founder amendment (2026-11-11) to #880 / #898: the home page's
 * photographic anchors are FIXED assets, curated once — never
 * borrowed from trip inventory, so they cannot change (or silently
 * break) when trips are added, edited or removed. The hero is a
 * place photograph, not a bookable trip: it carries no link and no
 * trip title, only the place name.
 *
 * Provenance (all Unsplash, free licence; each was already the lead
 * image of a catalogue trip before being frozen as an asset):
 * - Hero — Erg Chebbi dunes at golden hour:
 *   photo-1542401886-65d6c61db217, lead image of the catalogue's
 *   Erg Chebbi / Merzouga trips.
 * - Chefchaouen — the blue-city panorama:
 *   photo-1569383746724-6f1b882b8f46, lead image of the Blue Pearl
 *   Photography Tour.
 * - Tangier and Tétouan have no place photograph in the catalogue
 *   media (Tangier's test trips carry placeholder images and
 *   Tétouan has no trips), so their destination tiles keep the
 *   fixed brand-graded treatment until a licensed photo is curated.
 */
export const HERO_IMAGE = { src: '/images/hero-erg-chebbi.jpg' } as const;

/** Fixed destination-tile photographs by destination slug. A slug
 * absent here renders the brand-graded tile — by design, never a
 * trip photo. */
export const DESTINATION_IMAGES: Record<string, string> = {
  chefchaouen: '/images/destinations/chefchaouen.jpg',
};
