import { BetaBadge, LogoLockup } from '@ouiboo/ui';

/**
 * Card-style brand lockup shared by the traveller auth screens (login,
 * signup, verify): the final LogoLockup (#794) + BETA pill. Extracted
 * so the three screens render one identical lockup instead of three
 * hand-copied blocks; the BetaBadge stays a separate badge beside the
 * lockup for as long as the beta lasts (see @ouiboo/ui BetaBadge for
 * the off switch). The card is a themed surface (bg-card), so the
 * lockup follows the theme (tone auto).
 */
export function AuthBrandLockup() {
  return (
    <>
      <LogoLockup height={36} tone="auto" className="group-hover:scale-105 transition-transform" />
      <BetaBadge />
    </>
  );
}
