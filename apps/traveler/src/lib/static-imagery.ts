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
 * - Chefchaouen — the blue-city panorama:
 *   photo-1569383746724-6f1b882b8f46, lead image of the Blue Pearl
 *   Photography Tour (frozen in round 1).
 * - Category tiles (the proposal's "Travel your way" picks):
 *   Adventure — a trekker facing the Toubkal massif,
 *   photo-1559315390-1065ae6b47c0 (Atlas Trek gallery);
 *   Cultural — a carved doorway in an old medina,
 *   photo-1531230689007-0b32d7a7c33e (Fes el-Bali gallery);
 *   Nature — a green valley under the snow-capped Toubkal massif,
 *   photo-1716240772720-81a703864c6e (Atlas Trek lead image).
 * The proposal's fourth tile, "Desert nights", is not a catalogue
 * category or search facet, so it is not rendered (see #898).
 *
 * PHOTO-TRUTH AUDIT (design-directions council P0-1, Trust veto,
 * 2026-11-11; see #898): a place name + live count makes a tile
 * photo a REPRESENTATION of that place, so every static tile photo
 * was verified against its label. Two round-2 picks failed and
 * were reverted to the brand-graded tile — the honest fallback:
 * - Tangier: round 2 froze a lantern-souk photo that is in fact a
 *   gallery photo of the FES el-Bali trip. No photograph of
 *   Tangier exists anywhere in catalogue media (its only trips
 *   carry a desert data-fixture), so the tile stays graded until
 *   a true Tangier photo is curated.
 * - Tétouan: round 2 froze a zellige-fountain photo from the
 *   Casablanca & Rabat tour; it does not depict Tétouan, which
 *   has no trips and no media at all. Graded tile, same rule.
 * The Nature tile also failed as a Morocco representation: the
 * round-2 photo (photo-1470071459604) is the Quiraing on the Isle
 * of Skye, Scotland — replaced above with the Atlas Trek lead.
 * A generic medina/souk photograph may NOT stand in for a named
 * city; new frozen assets must pass this place-check.
 *
 * FOLLOW-UP CURATION (founder-approved, 2026-11-11): the four
 * places the audit left graded now carry photographs that were
 * individually VISUALLY VERIFIED against their labels. Source for
 * all four: Wikimedia Commons (licence-clean; attribution recorded
 * here and on #898 — these are curated assets, so their provenance
 * IDs are Commons file names, not Unsplash photo tokens):
 * - Tangier — the octagonal minaret of the Kasbah Mosque above the
 *   whitewashed kasbah quarter: "Kasbah Mosque in Tangier.jpg" by
 *   Rachidourkia, CC BY-SA 4.0.
 * - Tétouan — a whitewashed medina alley with the city's pointed
 *   sabat arches and a green door: "Tetouan Old Medina streets
 *   4.jpg" by Ideophagous, CC BY-SA 4.0.
 * - Casablanca — the Hassan II Mosque from its esplanade (minaret,
 *   prayer hall, arcades): "Hassan II Mosque - general framing,
 *   Casablanca, Morocco.jpg" by Tinuzzo, CC BY 4.0.
 * - Imlil — the terraced earthen village above the Mizane valley
 *   terraces under the Atlas massif: "Imlil village, High Atlas
 *   Mountains.jpg" by Mounir Neddi, CC BY-SA 4.0.
 * Rejected after visual inspection (do not re-add): the
 * watermarked Travel4Brews Tangier photographs; a genuine but
 * generic Tangier-medina shop interior (the audit's rule above);
 * a Hassan II plaza shot that never shows the mosque; a
 * black-and-white corniche shot; a generic olive-plain photograph
 * filed under Imlil commune.
 */
export const HERO_IMAGE = { src: '/images/hero-atlas-night.jpg' } as const;

/** Fixed destination-tile photographs by destination slug. A slug
 * absent here renders the brand-graded tile — by design, never a
 * trip photo. All three cluster slugs are curated: Chefchaouen
 * from round 1, Tangier and Tétouan from the verified follow-up
 * curation (header comment, #898) — a photo of somewhere else may
 * still never stand in for a named place. */
export const DESTINATION_IMAGES: Record<string, string> = {
  tangier: '/images/destinations/tangier.jpg',
  tetouan: '/images/destinations/tetouan.jpg',
  chefchaouen: '/images/destinations/chefchaouen.jpg',
};

/** Fixed coverage-showcase photographs for destinations beyond
 * the cluster, keyed by the folded place name the showcase groups
 * by (lowercase, spaces stripped — the same keying as the coverage
 * descriptors in HomeClient). The showcase's media pick runs
 * first; a destination listed here always renders its curated
 * asset instead, so a place whose trip media holds no truthful
 * photo of itself (Casablanca, Imlil — see NON_PLACE_PHOTO_IDS)
 * still shows a verified photograph of the place. Destinations
 * absent here keep the media pick, and a pick that exhausts to
 * null renders the graded tile. */
export const COVERAGE_IMAGES: Record<string, string> = {
  casablanca: '/images/destinations/casablanca.jpg',
  imlil: '/images/destinations/imlil.jpg',
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
  'photo-1569383746724-6f1b882b8f46',
  'photo-1559315390-1065ae6b47c0',
  'photo-1531230689007-0b32d7a7c33e',
  'photo-1716240772720-81a703864c6e',
];

/**
 * Unsplash photo IDs verified NOT to depict the place whose
 * coverage tile would pick them (photo-truth audit, council P0-1,
 * 2026-11-11; see #898). The coverage pick skips these too, so a
 * destination whose trip media holds no truthful photo renders
 * the graded tile instead of a photograph of somewhere else:
 * - photo-1539020140153 — an ornate zellige fountain carried by
 *   the Casablanca & Rabat tour; it depicts neither Tétouan (its
 *   round-2 static misuse) nor Casablanca.
 * - photo-1507525428034 / photo-1505142468610 — a tropical beach
 *   at sunset / an aerial tropical shoreline, from the same
 *   tour's gallery; neither depicts Casablanca.
 * - photo-1596040033229 — a spice flat-lay on a table; not a
 *   place at all (Casablanca & Rabat / Fes / Marrakech galleries).
 * - photo-1506905925346 — Moraine Lake, Canada, and
 *   photo-1483728642387 — a Himalaya-style peak; both sit in the
 *   Atlas Trek gallery and would otherwise become the "Imlil"
 *   coverage photo once the trek's true lead image (frozen as
 *   the Nature tile above) is excluded as a static asset.
 * The skipped destinations keep their live count and from-price;
 * only the photograph is withheld.
 */
export const NON_PLACE_PHOTO_IDS: readonly string[] = [
  'photo-1539020140153-e479b8c22e70',
  'photo-1507525428034-b723cf961d3e',
  'photo-1505142468610-359e7d316be0',
  'photo-1596040033229-a9821ebd058d',
  'photo-1506905925346-21bda4d32df4',
  'photo-1483728642387-6c3bdd6c93e5',
];
