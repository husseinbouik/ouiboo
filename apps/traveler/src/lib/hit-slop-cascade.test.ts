/**
 * Council Session #3 P0-1 — cascade regression guard for #490.
 *
 * The #490 `.hit-slop` utility originally set `position: relative`
 * unconditionally in `packages/tokens/tokens.css`. That block sits after
 * Tailwind's `.absolute` in the same utilities layer at equal
 * specificity, so it silently overrode `absolute` on every element
 * carrying both classes — the TripCard carousel buttons collapsed
 * in-flow and the Next button was clipped at the card's left edge
 * (proven from the served stylesheet; jsdom cannot see the compiled
 * cascade, so this guard asserts the source invariant instead).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const tokensCss = readFileSync(
  resolve(__dirname, '../../../../packages/tokens/tokens.css'),
  'utf8',
);
// #490 round 2: the card carousel is the shared SnapRail component
// (extracted from the trip-page gallery), so the carousel-control
// invariants below assert against SnapRail.tsx — same guards, new home.
const tripCard = readFileSync(
  resolve(__dirname, '../components/SnapRail.tsx'),
  'utf8',
);

describe('hit-slop cascade (Session #3 P0-1)', () => {
  it('never sets position on the bare .hit-slop selector', () => {
    // A bare `.hit-slop { ... position: ... }` rule is the regression.
    expect(tokensCss).not.toMatch(/\.hit-slop\s*\{[^}]*position\s*:/);
  });

  it('anchors the ::after only via the positioned-element guard', () => {
    expect(tokensCss).toMatch(
      /\.hit-slop:not\(\.absolute, \.fixed, \.sticky, \.relative\)\s*\{\s*position: relative;/,
    );
    expect(tokensCss).toMatch(/\.hit-slop::after\s*\{[^}]*position: absolute;/);
  });

  it('carousel arrows stay visible on coarse pointers and on focus', () => {
    // #490 rework (founder spec): the arrows are now genuine 44px
    // (w-11 h-11) and ALWAYS visible — the earlier hover-reveal pattern
    // (opacity-0 until group-hover on hover-capable devices) is gone,
    // superseded by the Snap Rail batch spec.
    expect(tripCard).toContain('w-11 h-11');
    expect(tripCard).not.toContain('[@media(hover:hover)]:opacity-0');
    expect(tripCard).not.toMatch(/opacity-0 group-hover:opacity-100/);
  });

  it('carousel indicators are real buttons with labels', () => {
    expect(tripCard).toContain("t('tripCard.viewImage'");
    expect(tripCard).toContain('aria-current={currentImage === i || undefined}');
  });
});
