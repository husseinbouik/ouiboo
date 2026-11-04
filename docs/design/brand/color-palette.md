# Colour palette

**One shared palette for every app.** Colour *values* live in exactly one place —
`packages/tokens/tokens.css` — with a TypeScript mirror in
`packages/tokens/colors.ts` that must match it. Apps import the tokens; a per-app
colour defined in an app's own globals is drift, not a feature.

## Brand core

| Token | Hex | Role |
|---|---|---|
| `--deep-blue` | `#0A192F` | Primary brand colour: text, headings, operator surfaces, logo on light |
| `--sunset-orange` | `#FF6B35` | Brand accent: the logo's arc/dot/tittle, display highlights, traveller lead |
| `--sunset-orange-dark` | `#B93E0C` | AA-safe orange for **text and interactive surfaces** (see note) |
| `--sand` | `#F7E1C3` | Warm neutral: soft fills, chart series |
| `--ocean` | `#2EC4B6` | Secondary accent: chart series, supporting highlights |
| `--off-white` | `#F9FAFB` | Neutral light surface |

**Why an AA shade exists.** `#FF6B35` on white is 2.84:1 contrast — fine for
display and brand marks, below the 4.5:1 AA minimum for text. `--sunset-orange-dark`
(`#B93E0C`) measures 5.59:1 on white and 4.71:1 on the cream muted surface, so
text and interactive elements use it while brand/display use keeps the vivid
orange (#332). The same pattern repeats for success and warning below.

## Scales

| Scale | Steps |
|---|---|
| `brand` (orange) | 50 `#FFF7ED` · 100 `#FFEDD5` · 200 `#FED7AA` · 300 `#FDBA74` · 400 `#FB923C` · 500 `#FF6B35` · 600 `#EA580C` · 700 `#C2410C` · 800 `#9A3412` · 900 `#7C2D12` |
| `navy` | 50 `#EFF6FF` · 500 `#0A192F` · 700 `#0F245F` · 900 `#07152F` |
| `ocean` | 50 `#ECFEFF` · 100 `#CFFAFE` · 300 `#67E8F9` · 500 `#06B6D4` · 700 `#0E7490` · 900 `#164E63` |

## Emphasis: one palette, different leads

Apps differentiate by **emphasis, never by separate brand colours** (founder
decision, 2026-10-27; implemented as the token layer in #562):

| App | Lead | Support |
|---|---|---|
| Traveller | Sunset orange leads — actions, gradients, highlights | Deep blue supports |
| Agency | Deep blue leads — primary surfaces, navigation | Sunset orange only for actions and accents |
| Admin | Follows the agency (operator) emphasis | — |
| Landing | Follows the agency (operator) emphasis, unless a screen is traveller-facing marketing | — |

Mechanically, `tokens.css` defines `--lead` / `--support` tokens selected by a
`data-emphasis` attribute on each app's `<html>` element (`traveler` | `agency` |
`admin` | `landing`). The default layer **is** the operator emphasis, so agency,
admin, and landing need no opt-in; the traveller app sets
`data-emphasis="traveler"`. In the traveller layer, light-mode interactive
`--primary` resolves to the AA shade (`--sunset-orange-dark`) while the display
lead stays vivid orange; in dark mode the traveller primary is the vivid orange.

**Why emphasis instead of per-app palettes.** One brand has to read as one brand
to travellers, agencies, and partners who move between the apps — and the logo is
unified across all of them (see logo.md). Emphasis gives each audience its own
feel (warm and traveller-led vs. sober and operator-led) without fragmenting the
identity or the token system.

## Semantic colours

Light theme (`:root` in tokens.css):

| Token | Value | Token | Value |
|---|---|---|---|
| `--background` | `#FFFAF4` | `--destructive` / `--danger` | `#E11D48` |
| `--foreground` | `#0A192F` | `--danger-dark` (text shade) | `#BE123C` |
| `--card` | `rgba(255,255,255,0.92)` | `--success` | `#059669` |
| `--popover` | `#FFFFFF` | `--success-dark` (text shade) | `#047857` |
| `--primary` | `#0A192F` | `--warning` | `#D97706` |
| `--secondary` / `--muted` | `#F5EADC` | `--warning-dark` (text shade) | `#9A3412` |
| `--muted-foreground` | `#6B6175` | `--border` | `rgba(10,25,47,0.12)` |
| `--accent` | `#B93E0C` (the AA orange) | `--ring` | `rgba(10,25,47,0.18)` |

Dark theme (`.dark` in tokens.css):

| Token | Value | Token | Value |
|---|---|---|---|
| `--background` | `#06101F` | `--accent` | `#FF6B35` |
| `--foreground` | `#F8FAFC` | `--destructive` / `--danger` | `#FB7185` |
| `--card` | `rgba(13,28,52,0.92)` | `--success` | `#34D399` |
| `--popover` | `#13243D` | `--warning` | `#FBBF24` |
| `--primary` | `#3D5A80` (lifted navy) | `--muted-foreground` | `#A6B4C8` |
| `--secondary` / `--muted` | `#13243D` | `--border` | `rgba(226,232,240,0.14)` |

Notes on the dark theme:

- Dark mode does **not** flip `--primary` to orange for every app (#562) — the
  operator emphasis leads with the lifted navy `#3D5A80`; orange leads on dark
  only in the traveller emphasis layer, and stays the accent elsewhere.
- On dark surfaces the base success/warning shades already meet AA for text, so
  the `-dark` text variants resolve to the base shades.
- Chart series: light `#FF6B35, #2EC4B6, #0A192F, #F7E1C3, #0EA5E9` ·
  dark `#FB7185, #2EC4B6, #0EA5E9, #FBBF24, #A78BFA` (`--chart-1` … `--chart-5`).
- Sidebar tokens (`--sidebar`, `--sidebar-primary`, …) are declared for both
  themes in tokens.css.

## Elevation

| Token | Value |
|---|---|
| `--shadow-brand` | `0 24px 80px -36px rgba(255, 107, 53, 0.7)` |
| `--shadow-elevated` | `0 24px 70px -42px rgba(7, 21, 47, 0.55)` |

## Themes

Dark mode is class-based (`.dark` on `<html>`, via `@variant dark` in each app's
globals). Semantic tokens flip per theme; the brand constants (`--deep-blue`,
`--sunset-orange`, …) do not. The landing app follows the visitor's system theme
(next-themes, system default) and has no in-app toggle; the product apps expose a
theme toggle.

## Known exception

The transactional **email template** (`apps/api/src/email/email-template.ts`)
carries a pre-existing accent `coral: #F26B38` in its own BRAND palette, which is
not the brand orange `#FF6B35`. It is a legacy email-design accent, flagged during
the logo rollout (2026-11-04) and left untouched there; treat `#FF6B35` as the
only brand orange everywhere else.

*Values verified against `packages/tokens/tokens.css` and `colors.ts` at staging
head `ce577fda` (2026-11-04).*
