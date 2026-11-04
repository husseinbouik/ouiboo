import { BetaBadge, LogoLockup } from '@ouiboo/ui';

/**
 * Side-panel wordmark shared by the traveller split-screen auth pages
 * (forgot password, reset password): the final LogoLockup (#794) with
 * the BETA pill beside it, rendered over the hero image. The panel is
 * a fixed deep-blue surface with a photo overlay (text-white in both
 * themes), so the lockup is the on-dark colourway.
 */
export function AuthSideWordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoLockup height={38} tone="on-dark" />
      <BetaBadge />
    </div>
  );
}
