# The Ouiboo logo

**Final mark, founder-approved 2026-11-04.** This is the only logo. The interim
"Pin" mark used before it is retired and must not be used anywhere.

## Type

A **combination mark**: an abstract symbol plus a custom wordmark, designed as one
system — the wordmark's letterforms reuse the symbol's geometry.

- **Symbol — "Route-End" (V1).** An open ring: the journey. The top of the ring is
  carried by a sunset-orange route arc, and just past the arc's end, on the same
  circular path, floats a single orange dot: the destination.
- **Wordmark — "Destination Tittle" (W3).** "Ouiboo" set in Poppins Bold outlines.
  The capital O and the two lowercase o's are drawn as rings in the symbol's own
  geometry, and the dot over the "i" (the *tittle*) is sunset orange — the
  destination point hiding inside the name.

**Why this mark.** The founder reviewed two concept rounds (six directions, then
five refinements of the chosen lettermark direction) judged from true-size renders,
and picked V1 + W3 on 2026-11-04. The route → destination story is the identity:
travel is a path that ends somewhere you chose. The pair was chosen because the
full story — arc, gap, dot — survives at 16 px, which the alternatives did not
(the path-inward variant's inner dot and the arrowhead variant both collapsed at
favicon size).

## Construction

Drawn on a **120-unit grid**:

| Element | Geometry |
|---|---|
| Ring | Centreline diameter 54 u, stroke 16 u, centred at (60, 60) |
| Route arc | Same circular path as the ring, across the top, sunset orange |
| Destination dot | Ø 17 u, on the ring's path just past the arc's end |
| Wordmark rings | "O" and "oo" redrawn as rings in the symbol's geometry |
| Master sizes | Lockup 427 × 120 · wordmark 283 × 120 · symbol 120 × 120 |

Never separate the arc from the dot, and never redraw, re-space, or re-typeset the
wordmark — use the masters or the `Logo` components (below).

## Colourways — the only three

| Use | Ring + wordmark | Arc + dot + tittle |
|---|---|---|
| On dark backgrounds | White `#FFFFFF` | Sunset orange `#FF6B35` |
| On light backgrounds | Deep blue `#0A192F` | Sunset orange `#FF6B35` |
| App tile | White symbol on a deep-blue `#0A192F` rounded tile (corner radius 27 u, tile inset 8 u) | Sunset orange `#FF6B35` |

**Why.** One mark, unified across all apps (traveller, agency, admin, landing) —
the palette's per-app *emphasis* differences (see color-palette.md) never touch
the logo. The orange is never swapped, muted, or given a gradient: it is the
destination, and it is always the same orange.

**App-tile small-size cut.** Inside the tile only, the symbol is scaled to 0.82
with stroke 17 u and the dot at Ø 18.5 u. At a true 16 px render the unadjusted
tile reduced the destination dot to a single orange pixel and it no longer read;
the adjusted cut keeps arc and dot distinct. The standalone symbol masters keep
the original geometry untouched.

## Clearspace and minimum sizes

- **Clearspace:** one destination-dot diameter (17 u on the 120 grid) on all sides
  of the lockup; half that around the symbol alone. No type, rules, or photo edges
  inside it.
- **Primary lockup:** minimum height **24 px** on screen (8 mm in print). At 24 px
  the orange tittle still reads (a 5-pixel cluster in direct renders); at 16 px it
  collapses to a 2-pixel streak.
- **Small-size lockup:** below 24 px height, use the small-size variant — the
  identical lockup with the tittle in the letter colour. Do not shrink the primary
  lockup below 24 px instead. In code, `LogoLockup` switches to the small master
  automatically below 24 px.
- **Symbol / tile:** minimum 16 px — arc and destination dot verified readable at
  16 px on white, navy, and charcoal, from direct renders (never downscaled
  approximations).

## The BETA pill is not part of the logo

The amber **BETA** pill next to the logo is a product badge (`BetaBadge` in
`packages/ui/BetaBadge.tsx`), requested by the founder on 2026-10-27 while the
product is a closed testing version. It is styled once for all apps (amber-400
background, amber-950 text, 10 px, uppercase, wide tracking), reads "BETA" in
every locale, and is switched per app with `NEXT_PUBLIC_BETA_BADGE`. Never bake
it into the lockup; when the beta ends, the badge is removed by the switch and
the logo is untouched.

## Language rule

The wordmark is **Latin script in all locales, including Arabic** — there is no
Arabic-script version, and the lockup is never mirrored in RTL layouts.
(Founder decision, 2026-10-27.)

## Where it lives in the code

| Surface | Location |
|---|---|
| Shared components | `packages/ui/Logo.tsx` — `Logo` (symbol), `LogoWordmark`, `LogoLockup`; tones `auto` (theme-following), `on-dark`, `on-light`, `tile` |
| Favicons / app icons | Per app: `src/app/icon.png`, `src/app/favicon.ico`, `src/app/apple-icon.png` |
| Traveller PWA | `apps/traveler/public/icon-192.png`, `icon-512.png`, `manifest.webmanifest` |
| Native shell | `native/traveler/resources/icon-192.png`, `icon-512.png`, iOS AppIcon set |
| Social / OG images | `apps/traveler/src/app/opengraph-image.tsx`, `apps/landing/src/lib/og-image.tsx` (app-tile master) |
| Email | `apps/api/src/email/email-template.ts` — on-dark primary lockup on the navy header |

## Do / Don't

- **Do** use the white-ring version on dark backgrounds and the navy-ring version
  on light ones; use the symbol alone for app icons, favicons, avatars, and
  social profiles.
- **Do** keep the logo identical across all apps.
- **Don't** recolour the mark per app or per campaign; don't swap, mute, or
  gradient the orange.
- **Don't** place the white-ring version on light backgrounds or the navy-ring
  version on dark ones.
- **Don't** rotate, stretch, re-space, re-typeset, or redraw the wordmark; don't
  add shadows, outlines, glows, or effects.
- **Don't** use the retired interim Pin mark.

*Status: live on staging — rolled out by PRs #795/#797 (issue #794, verified in
staging 2026-11-04, per-surface rendered check). Production follows the pending
promotion window. Master artwork and QA renders: final-logo production package
(goal workspace, `files/logo-final-2026-11-04/`).*
