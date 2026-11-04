import { BetaBadge, LogoLockup } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';

/**
 * Hero-panel wordmark shared by the agency auth screens (login, signup,
 * forgot password, reset password): the final LogoLockup (#794) with
 * the BETA pill beside it. Pass `className` for alignment (e.g.
 * "justify-end" on the pages whose panel right-aligns the wordmark).
 * The hero panel is a fixed deep-blue/photo surface (text-white in
 * both themes), so the lockup is the on-dark colourway.
 */
export function AuthSideWordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoLockup height={38} tone="on-dark" />
      <BetaBadge />
    </div>
  );
}
