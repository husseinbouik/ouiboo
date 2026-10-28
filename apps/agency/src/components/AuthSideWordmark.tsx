import { BetaBadge, Logo } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';

/**
 * Hero-panel wordmark shared by the agency auth screens (login, signup,
 * forgot password, reset password): the shared pin Logo + the large
 * "Ouiboo" wordmark with the BETA pill beside it. Pass `className` for
 * alignment (e.g. "justify-end" on the pages whose panel right-aligns
 * the wordmark). (Session #3 P0-4, #552: this lockup previously had no
 * brand mark at all.)
 */
export function AuthSideWordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Logo size={36} />
      <span className="text-3xl font-bold tracking-tight">Ouiboo</span>
      <BetaBadge />
    </div>
  );
}
