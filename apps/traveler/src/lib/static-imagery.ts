/**
 * Founder amendments (2026-11-11) to #880 / #898: the home page's
 * photographic anchors are FIXED assets, curated once — never
 * borrowed live from trip inventory, so they cannot change (or
 * silently break) when trips are added, edited or removed. The hero
 * is a place photograph, not a bookable trip: it carries no link
 * and no trip title, only the place name.
 *
 * Provenance (all Unsplash, free licence; every photo was already
 * part of the catalogue's media before being frozen as an asset).
 * Round 1 froze an Erg Chebbi hero; the founder's round-2 review
 * ("some images are not appearing good") found it hazy and
 * duplicated by the lead featured card, so round 2 re-freezes the
 * set to the Council #12 proposal's OWN chosen photographs:
 * - Hero — the Milky Way over the Atlas Mountains:
 *   photo-1519681393784-d120267933ba, a gallery photo of the Atlas
 *   Mountains Trek (the proposal's hero visual, desktop.html).
 * - Tangier — lanterns and goods in a northern medina souk:
 *   photo-1569440703456-29b9c31765ca, a gallery photo of the Fes
 *   el-Bali trip (the proposal's Tangier tile visual).
 * - Tétouan — zellige tilework of a white-medina fountain wall:
 *   photo-1539020140153-e479b8c22e70, lead photo of the Casablanca
 *   & Rabat Heritage Tour (the proposal's Tétouan tile visual).
 * - Chefchaouen — the blue-city panorama:
 *   photo-1569383746724-6f1b882b8f46, lead image of the Blue Pearl
 *   Photography Tour (frozen in round 1).
 * - Category tiles (the proposal's "Travel your way" picks):
 *   Adventure — a trekker facing the Toubkal massif,
 *   photo-1559315390-1065ae6b47c0 (Atlas Trek gallery);
 *   Cultural — a carved doorway in an old medina,
 *   photo-1531230689007-0b32d7a7c33e (Fes el-Bali gallery);
 *   Nature — misty green ridges of the Rif at sunrise,
 *   photo-1470071459604-3b5ec3a7fe05 (Blue Pearl gallery).
 * The proposal's fourth tile, "Desert nights", is not a catalogue
 * category or search facet, so it is not rendered (see #898).
 */
export const HERO_IMAGE = { src: '/images/hero-atlas-night.jpg' } as const;

/** Fixed destination-tile photographs by destination slug. A slug
 * absent here renders the brand-graded tile — by design, never a
 * trip photo. */
export const DESTINATION_IMAGES: Record<string, string> = {
  tangier: '/images/destinations/tangier.jpg',
  tetouan: '/images/destinations/tetouan.jpg',
  chefchaouen: '/images/destinations/chefchaouen.jpg',
};

/** Fixed category-tile photographs by lower-case category key
 * (#898: the proposal's photo tiles; a category renders only when
 * the live catalogue gives it at least two trips). */
export const CATEGORY_IMAGES: Record<string, string> = {
  adventure: '/images/categories/adventure.jpg',
  cultural: '/images/categories/cultural.jpg',
  nature: '/images/categories/nature.jpg',
};

/**
 * Unsplash photo IDs already shown on the home page by the fixed
 * assets above. The coverage showcase (#885, round 2) skips these
 * when picking a destination's photo from trip media, so no
 * photograph ever appears twice on the page.
 */
export const STATIC_HOME_PHOTO_IDS: readonly string[] = [
  'photo-1519681393784-d120267933ba',
  'photo-1569440703456-29b9c31765ca',
  'photo-1539020140153-e479b8c22e70',
  'photo-1569383746724-6f1b882b8f46',
  'photo-1559315390-1065ae6b47c0',
  'photo-1531230689007-0b32d7a7c33e',
  'photo-1470071459604-3b5ec3a7fe05',
];
