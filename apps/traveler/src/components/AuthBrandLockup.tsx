import { BetaBadge } from '@ouiboo/ui';

/**
 * Card-style brand lockup shared by the traveller auth screens (login,
 * signup, verify): the "O" tile + wordmark + BETA pill. Extracted so the
 * three screens render one identical lockup instead of three hand-copied
 * blocks; the BetaBadge is part of the lockup for as long as the beta
 * lasts (see @ouiboo/ui BetaBadge for the off switch).
 */
export function AuthBrandLockup() {
  return (
    <>
      <div className="w-10 h-10 rounded-xl bg-deep-blue dark:bg-sunset-orange text-white flex items-center justify-center font-bold text-xl shadow-lg group-hover:scale-105 transition-transform">
        O
      </div>
      <span className="text-2xl font-bold text-deep-blue dark:text-foreground">Ouiboo</span>
      <BetaBadge />
    </>
  );
}
