# Ouiboo design documentation

This directory is the written record of Ouiboo's design system **as implemented** —
what the brand looks like, what the interface does, and *why* each choice was made.
It exists so a new developer, designer, or partner can understand the system without
reading every component, and so the reasoning behind founder and council decisions
is not lost.

## Contents

| Document | What it covers |
|---|---|
| [brand/logo.md](brand/logo.md) | The final logo: type, construction, colourways, sizes, usage rules |
| [brand/color-palette.md](brand/color-palette.md) | Every colour token, the shared-palette rule, light/dark behaviour |
| [brand/typography.md](brand/typography.md) | Font families, stacks, the type scale, Arabic/RTL handling |
| [brand/iconography.md](brand/iconography.md) | The icon library, conventions, app icons and favicons |
| [ui-ux/patterns.md](ui-ux/patterns.md) | Implemented UI/UX patterns and the rationale behind each |

## Sources of truth

The documents describe the system; they do not replace its code sources:

- **Colour, type stacks, radius, shadows:** `packages/tokens/tokens.css`
  (TS mirrors in `packages/tokens/colors.ts`, `typography.ts`, `animations.ts` —
  values there must match `tokens.css`).
- **Logo:** `packages/ui/Logo.tsx` (`Logo`, `LogoWordmark`, `LogoLockup`),
  guarded by `packages/ui/Logo.test.tsx`; master artwork lives in the final-logo
  production package (see brand/logo.md).
- **Components and patterns:** `packages/ui/` and the app components cited in
  ui-ux/patterns.md.

Where a document and the code disagree, the code wins and the document is wrong —
fix the document in the same PR that exposes the drift.

## How to keep this current

- Any PR that changes a token value, a font, the logo, or a documented pattern
  must update the matching page here in the same PR.
- Values in these pages were verified against the code at the staging head noted
  in each page's status line. Anything that could not be verified is marked
  `[verify]` rather than guessed.
- The logo is a founder-approved asset: it changes only by explicit founder
  decision, never as a side effect of a feature PR.

*Status: written 2026-11-04 against staging head `ce577fda`. The final logo is
live on staging (rollout issue #794, verified in staging); production follows
the pending promotion window.*
