# Iconography

## Product icons: Lucide

All interface icons come from **Lucide**, via `lucide-react` (`^0.552.0`),
declared in all four apps (traveller, agency, admin, landing) and in
`@ouiboo/ui`. Lucide is a stroke-based outline set: icons are drawn with a
consistent 2 px stroke, round caps and joins, on a 24-unit grid — which is why
they sit comfortably next to the logo's ring geometry without imitating it.

Conventions:

- Import icons individually from `lucide-react`; size them with the `size` prop
  or Tailwind `h-*` / `w-*` utilities at the size the layout needs.
- Icons inherit `currentColor` — colour comes from the text/token colour of the
  context, never from a hard-coded hex in the icon.
- Icon-only buttons under 44 px use the shared `.hit-slop` utility so the
  tappable box still meets the 44 px floor (see ui-ux/patterns.md).
- Do not mix icon sets. `@heroicons/react` is still declared in
  `apps/landing/package.json`, but no current staging source imports it — it is
  a legacy dependency, not a second icon system, and new work must not use it.

**Why one library.** A single stroke weight and grid keeps dense operator
screens (agency, admin) and traveller surfaces visually consistent, and one
dependency keeps bundle and maintenance cost flat. The brand mark is *not* a
Lucide icon and must never be replaced by one: the Route-End symbol is custom
(see logo.md).

## The logo as an icon

The symbol alone serves as the app icon, favicon, avatar, and social-profile
image — always the **app-tile cut**: white symbol on the deep-blue `#0A192F`
rounded tile, with the adjusted small-size geometry (scale 0.82, stroke 17 u,
dot Ø 18.5 u) that keeps the destination dot readable at 16 px. Construction
and rationale: logo.md.

## App-icon and favicon set

Generated from the tile master in the final-logo production package
(16 / 24 / 32 / 48 / 180 / 192 / 512 px PNG + a multi-size `favicon.ico`).
In the repo:

| Surface | Files |
|---|---|
| Every web app (traveller, agency, admin, landing) | `src/app/icon.png`, `src/app/favicon.ico`, `src/app/apple-icon.png` (180 px) |
| Traveller PWA | `apps/traveler/public/icon-192.png`, `apps/traveler/public/icon-512.png`, referenced by `apps/traveler/public/manifest.webmanifest` |
| Traveller native shell | `native/traveler/resources/icon-192.png`, `native/traveler/resources/icon-512.png`, and the iOS `AppIcon.appiconset` under `native/traveler/ios/` |
| Social / OG images | Rendered from the tile master by `apps/traveler/src/app/opengraph-image.tsx` and `apps/landing/src/lib/og-image.tsx` |

The favicon and PWA files on staging were verified byte-identical to the
production-package masters during the logo rollout (#794). If the mark ever
changes, regenerate the whole set from the new masters — never hand-edit a
single size.

## Photography and imagery (brief)

Trip photography is agency-supplied and is treated as content, not iconography;
the shared `SafeImage` component (`packages/ui/SafeImage.tsx`) falls back to the
Route-End symbol (`<Logo size={44}>`) when an image fails to load, so a broken
photo degrades to the brand mark rather than a broken-image glyph.

*Verified against the app `package.json` files and the staging tree at head
`ce577fda` (2026-11-04).*
