import { LogoLockup } from '@ouiboo/ui';

/**
 * Card-style brand lockup shared by the traveller auth screens (login,
 * signup, verify): the final LogoLockup (#794) alone — no BETA pill
 * (founder de-beta decision, 2026-11-11). Extracted so the three
 * screens render one identical lockup instead of three hand-copied
 * blocks. The card is a themed surface (bg-card), so the lockup
 * follows the theme (tone auto).
 */
export function AuthBrandLockup() {
  return (
    <>
      <LogoLockup height={36} tone="auto" className="group-hover:scale-105 transition-transform" />
    </>
  );
}
