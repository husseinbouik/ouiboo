import { BetaBadge, Logo } from '@ouiboo/ui';

/**
 * Side-panel wordmark shared by the traveller split-screen auth pages
 * (forgot password, reset password): the shared pin Logo + the large
 * "Ouiboo" wordmark with the BETA pill beside it, rendered over the
 * hero image. (Session #3 P0-4, #552: this lockup previously had no
 * brand mark at all.)
 */
export function AuthSideWordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={36} />
      <span className="text-3xl font-bold tracking-tight">Ouiboo</span>
      <BetaBadge />
    </div>
  );
}
