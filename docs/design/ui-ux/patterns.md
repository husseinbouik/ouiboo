# UI/UX patterns

The patterns the apps are actually built with — what each one is, where it lives,
and why it is that way. Decisions are credited to the founder or council session
that made them, with dates, so the reasoning survives.

## Photo browsing

### Snap Rail carousel — with a seamless loop

- **What:** One shared rail component serves the traveller card galleries, the
  trip-page gallery, and the full-screen viewer. The strip carries a clone of
  the last photo before the first and a clone of the first photo after the
  last; when a scroll settles on a clone, the rail silently repositions to the
  real copy of the same photo, so swiping never hits a dead end.
- **Where:** `apps/traveler/src/components/SnapRail.tsx` (+ `SnapRail.test.tsx`).
- **Why:** The founder chose "Option A — Snap Rail" from a six-option wireframe
  comparison (2026-10-30) and asked for looping rather than a dead end. Two
  hard-won behaviours from the #490 saga are part of the pattern: scroll-snap
  is suspended during a mouse drag (otherwise the ≥ 64 px settle rule starves),
  and the rail accepts `touch-action: pan-x pan-y` so touch drags work. On
  mobile the rail runs edge-to-edge, full-bleed (#625).

### Full-screen PhotoViewer — on the trip page only

- **What:** A full-screen viewer over a dark backdrop: the Snap Rail with
  photos shown whole, an always-visible counter, a per-photo caption, and a
  Booking-style filmstrip along the bottom. Esc closes, arrow keys step
  (direction follows the UI's text direction), focus is trapped while open,
  and closing returns focus to the opener.
- **Where:** `apps/traveler/src/components/PhotoViewer.tsx` (#623).
- **Why:** Both Airbnb and Booking.com open a full-screen viewer and Ouiboo had
  none (founder decision, 2026-10-28, from that wireframe comparison); the
  per-photo caption is Ouiboo's edge over both. Filmstrip jumps are *instant*
  (the rail teleports instead of smooth-scrolling through every intermediate
  slide), and wrap-around is a single step — fixed in #654 after the first
  version scrolled through the whole strip. The viewer lives **only on the
  trip page**: the founder found it "over exaggerated" on cards, so a card tap
  navigates to the trip page instead (2026-10-29).

### Desktop mosaic gallery

- **What:** At desktop widths the trip page shows a mosaic — the cover photo
  large on the left, photos 2–5 in a 2×2 block on the right — so the first
  five photos are visible with zero interaction. Clicking any cell opens the
  PhotoViewer at that photo. The component degrades gracefully for 1–4 photos
  and is only mounted at `lg` and up; below that, the Snap Rail renders.
- **Where:** `apps/traveler/src/components/TripMosaic.tsx` (#624).
- **Why:** Airbnb's mosaic pattern, adopted in the same 2026-10-28 design
  batch: travellers judge a trip by its photos, and the first screen should
  not hide four of the five best ones behind a carousel interaction.

## Headers and navigation

### Traveller header: desktop bar only at true laptop width

- **What:** Below 1024 px the traveller app shows a clean mobile bar — logo +
  BETA pill, theme toggle, Sign up, and a menu button; navigation links,
  Login, and the language/currency selectors live inside the menu. At
  `lg` (1024 px) and up the full desktop bar renders.
- **Where:** `apps/traveler/src/components/Navbar.tsx` (desktop links are
  `hidden lg:flex`).
- **Why:** The desktop row's intrinsic width is ~1014 px. Under the old
  `md` (768 px) breakpoint it clipped its own controls between 768–1013 px —
  on real phones the theme toggle and Login/Sign up disappeared (#648, #672;
  fixed by raising every header switch from `md` to `lg`, 2026-10-30).

### Landing header and themes

- **What:** The landing app uses the same lockup rules but follows the
  visitor's system theme (next-themes, system default) — there is no theme
  toggle in the landing app.
- **Why:** A marketing page should open the way the visitor's phone is already
  set; the product apps keep explicit toggles (#737 polish, 2026-10-31).

## Cards

- **What:** A trip card's photo is a plain link to `/trip/<id>` — no viewer,
  no overlay UI. The wishlist control is a counter pill in brand orange
  (`bg-sunset-orange text-deep-blue`).
- **Where:** `apps/traveler/src/components/TripCard.tsx`, `Navbar.tsx`.
- **Why:** The card viewer was removed on the founder's call (see PhotoViewer).
  The wishlist pill is a *counter*, not an alert: it was softened from red to
  brand orange (contrast 6.21:1) in #721 because a red badge reads as an
  error/notification, which a saved-items count is not (2026-10-30).

## Money presentation

### MAD is the amount; conversions are reference only

- **What:** Prices are charged in the trip's local currency (MAD in Morocco).
  A traveller may pick a *display* currency (MAD, USD, EUR, GBP, AED, TND) and
  prices render converted — but the actionable payment instruction always
  states the MAD amount ("You pay a deposit of **MAD 200.00** directly to
  *<agency>* now"), with the converted figure demoted to a reference-only
  line carrying the note "Shown in EUR for reference — you will pay in MAD"
  (`checkout.displayCurrencyNote`).
- **Where:** `apps/traveler/src/components/checkout/CheckoutPayment.tsx`,
  `CheckoutSummary.tsx`; display-currency state in
  `apps/traveler/src/lib/display-currency.tsx`; rates from
  `apps/api/src/currency/`.
- **Why:** Council Session #5 found the original checkout rendered the
  *converted* amount as the amount to pay, with the real MAD figure in a 10 px
  note after the payment section — a traveller could transfer the wrong sum.
  Fixed in #655 (2026-10-29). The display currency itself is founder-approved
  as an inbound-tourist aid (2026-10-29): it never touches agency payouts or
  invoices, which are MAD only, and each future country market charges its own
  local currency.

## Trust display

### Verification is dated, and the chip makes no time promise

- **What:** Agency verification renders as dated statements — licence and
  insurance with the dates they were checked and run to — on cards, trip
  pages, agency pages, and checkout. The summary chip reads **"Checked before
  listing"**.
- **Where:** `apps/traveler/src/components/VerificationRecord.tsx`; the public
  record pattern from #688, first slice #673.
- **Why:** Verification depth is Ouiboo's defensible ground against competitors
  (Council Session #6). The chip previously implied a 48-hour verification
  promise; the founder removed every "48 hours" claim (2026-10-31) because
  Ouiboo does not promise a turnaround it cannot underwrite — the dated record
  is the proof, not a slogan. Related discipline (#661): no "first" or "only"
  claims, and no present-tense "verified agencies" copy until a real cohort
  exists.

## Language and direction

### i18n: three locales, French required to publish

- **What:** Interfaces ship in French, Arabic, and English. Trip content is a
  language-keyed map (any ISO code; the canonical locale is configuration,
  `TRIP_CONTENT_CANONICAL_LOCALE`, default `fr`). French is **required** to
  publish a trip; Arabic and English are encouraged by a completeness nudge
  and never block publishing. Fallback order: requested language → French →
  any available.
- **Why:** French is the operating language of Moroccan agencies; blocking a
  listing for missing Arabic or English would starve the catalogue, while
  publishing without French would break the primary audience. The data layer
  stays fully language-keyed so future languages need content, not code.

### RTL and bidi rules

- **What:** Layouts set `dir="rtl"` for Arabic; components use logical CSS
  properties (inline-start/end) so accents and spacing mirror correctly; the
  logo is never mirrored. Latin-script ranges embedded in Arabic text —
  dates, durations — are wrapped in `<bdi>` elements so they keep their
  internal order.
- **Why:** The `<bdi>` rule is the #746 fix (2026-11-04): Arabic date and
  duration ranges were garbling under the bidi algorithm. The FAQ accordion's
  calm expanded state (#772) puts its orange accent on the inline-start
  border for the same reason — it lands on the correct side in both
  directions.

## Accessibility floors

- **Touch targets ≥ 44 px.** Icon-only controls smaller than 44 px keep their
  visual size while the shared `.hit-slop` utility (tokens.css, #490) grows
  the tappable box to at least 44 × 44 px. Login and menu targets were brought
  to ≥ 44 px in #724/#730.
- **AA text shades.** Text and interactive surfaces use the AA-safe shades
  (`--sunset-orange-dark`, `--success-dark`, `--warning-dark`) wherever the
  vivid brand/semantic colour falls below 4.5:1 — see color-palette.md (#332).
- **Reduced motion.** `prefers-reduced-motion` neutralises CSS transitions,
  animations, smooth scrolling, and the trip-page view transitions
  (tokens.css; #488).
- **Safe areas.** `viewport-fit=cover` plus the `pb-safe` / `pt-safe`
  utilities in tokens.css keep sticky bars and bottom CTAs clear of the home
  indicator on notched devices (#491).
- **Keyboard and focus.** Skip links in every app layout; the PhotoViewer
  traps focus and restores it on close; keyboard access gaps found by
  councils are filed as issues (e.g. #656), not left as folklore.

## Motion

- **What:** The standard transition is 200 ms, `cubic-bezier(0.4, 0, 0.2, 1)`
  (`packages/tokens/animations.ts`). Trip navigation uses view transitions —
  the trip cover morphs card → detail hero, the rest cross-fades in 0.25 s
  (#488) — where the browser supports them, and not at all under
  reduced-motion.
- **Why:** One duration/easing pair keeps motion feeling like one product;
  progressive enhancement means unsupported browsers simply navigate as
  before.

*Patterns verified against the staging tree at head `ce577fda` (2026-11-04).
Older standards live in `docs/UX_BASELINE.md`; where the two disagree, this
document and the code win.*
