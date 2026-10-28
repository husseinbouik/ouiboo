import { BetaBadge, Logo } from '@ouiboo/ui';

/**
 * Card-style brand lockup shared by the traveller auth screens (login,
 * signup, verify): the shared pin Logo + wordmark + BETA pill. Extracted
 * so the three screens render one identical lockup instead of three
 * hand-copied blocks; the BetaBadge is part of the lockup for as long
 * as the beta lasts (see @ouiboo/ui BetaBadge for the off switch).
 * Session #3 P0-4 (#552): the mark is the shared Logo component — never
 * a hand-rolled, recoloured tile.
 */
export function AuthBrandLockup() {
  return (
    <>
      <Logo size={40} className="shadow-lg group-hover:scale-105 transition-transform rounded-xl" />
      <span className="text-2xl font-bold text-deep-blue dark:text-foreground">Ouiboo</span>
      <BetaBadge />
    </>
  );
}
