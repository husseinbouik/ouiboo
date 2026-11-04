# Typography

Font stacks are shared tokens: they are declared in `packages/tokens/tokens.css`
(mirrored in `packages/tokens/typography.ts`), while the font *files* are loaded
per app. A per-app font override in an app's globals is drift, not a feature.

## Families

| Family | Role | Loaded by |
|---|---|---|
| **Manrope** | UI / body text (`--font-sans`) | All four apps, `next/font/google` in each app's `src/app/layout.tsx` |
| **Space Grotesk** | Display / headings (`--font-display`) | All four apps, same mechanism |
| **Poppins Bold** | The logo wordmark only — as vector outlines in the masters and in `packages/ui/Logo.tsx` | Never loaded as a webfont |
| Geist Mono | Named first in the mono stack, but **not loaded by any app today** — mono text falls back to the system monospace (see below) | — |

Loading details, identical in traveller, agency, admin, and landing layouts:
`Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" })` and
`Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" })`.
Both are variable fonts; weights are chosen with the usual Tailwind font-weight
utilities. Variable-axis ranges: Manrope 200–800, Space Grotesk 300–700 `[verify]`.

## Stacks

```
--font-sans:    var(--font-manrope), var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif
--font-display: var(--font-space-grotesk), var(--font-manrope), ui-sans-serif, system-ui, sans-serif
--font-mono:    var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace
```

- Body text uses `font-sans`; `h1`–`h4` and `.font-display` use `font-display`
  (base rules in the traveller and landing globals).
- **Why Space Grotesk leads display.** Headings in a geometric display face give
  the marketing and traveller surfaces their character while Manrope keeps dense
  operator UI legible. The stacks were unified in #572 — before that, the agency
  app overrode headings to Manrope, so "display" meant different things in
  different apps.
- **Mono caveat.** The mono stack names `--font-geist-mono` first, but no layout
  loads Geist Mono, so code/IDs render in `ui-monospace` / SFMono-Regular /
  monospace. Separately, `apps/admin/src/app/globals.css` carries a legacy local
  stack override that also references an unloaded `--font-geist-sans` variable —
  observed drift; the canonical stacks are the ones in `packages/tokens`.

## Type scale

There are **no custom font-size tokens**. All apps use the Tailwind CSS v4
default scale (root font size 16 px):

| Utility | Size | Line height | Typical use |
|---|---|---|---|
| `text-xs` | 0.75 rem (12 px) | 1 rem | Captions, meta |
| `text-sm` | 0.875 rem (14 px) | 1.25 rem | Secondary text, table cells |
| `text-base` | 1 rem (16 px) | 1.5 rem | Body text |
| `text-lg` | 1.125 rem (18 px) | 1.75 rem | Lead paragraphs, card titles |
| `text-xl` | 1.25 rem (20 px) | 1.75 rem | Section subtitles |
| `text-2xl` | 1.5 rem (24 px) | 2 rem | Section headings |
| `text-3xl` | 1.875 rem (30 px) | 2.25 rem | Page headings |
| `text-4xl` | 2.25 rem (36 px) | 2.5 rem | Page heroes |
| `text-5xl` – `text-9xl` | 3 rem – 8 rem | 1 | Landing display headlines |

Component-level sizes that are part of the brand, not the scale: the BETA pill
is 10 px (`text-[10px]`, font-black, uppercase, tracking 0.14 em — see logo.md);
the keyboard-shortcut chip (`.oui-kbd` in tokens.css) is 0.6875 rem.

Two shared micro-utilities live in tokens.css (#493): `.oui-numeric` renders
figures with tabular (fixed-width) digits so prices, totals, and countdowns do
not shift width as values change; `.oui-balance` balances headline wraps (never
body text).

## Arabic and RTL

- Layouts set `lang` and `dir` from the active locale (`dir="rtl"` for Arabic).
- **No Arabic webfont is loaded**: the `next/font` subsets are `["latin"]` only,
  so Arabic text renders in the platform's system Arabic typeface via the sans
  stack's fallbacks. This is the implemented state; adding an Arabic webfont
  would be a deliberate future decision, not an accident of configuration.
- Latin-script strings that must not garble inside Arabic text — date and
  duration ranges, prices — are wrapped in `<bdi>` so the bidi algorithm keeps
  them intact (fixed in #746; see ui-ux/patterns.md).
- The logo wordmark stays Latin and unmirrored in RTL (see logo.md).

## Wordmark vs UI fonts

Poppins appears in exactly one place: the logo wordmark outlines. It is not a UI
font and must not be used for headings or body text — display headings are Space
Grotesk. Keeping the wordmark's letterforms exclusive to the mark is part of
what makes it recognisable.

*Verified against the four app layouts, `packages/tokens/tokens.css`, and
`packages/tokens/typography.ts` at staging head `ce577fda` (2026-11-04).*
