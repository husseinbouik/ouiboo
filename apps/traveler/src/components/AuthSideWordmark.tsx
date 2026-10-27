import { BetaBadge } from '@ouiboo/ui';

/**
 * Side-panel wordmark shared by the traveller split-screen auth pages
 * (forgot password, reset password): the large "Ouiboo" wordmark with
 * the BETA pill beside it, rendered over the hero image.
 */
export function AuthSideWordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-3xl font-bold tracking-tight">Ouiboo</span>
      <BetaBadge />
    </div>
  );
}
