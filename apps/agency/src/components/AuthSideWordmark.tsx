import { BetaBadge } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';

/**
 * Hero-panel wordmark shared by the agency auth screens (login, signup,
 * forgot password, reset password): the large "Ouiboo" wordmark with the
 * BETA pill beside it. Pass `className` for alignment (e.g. "justify-end"
 * on the pages whose panel right-aligns the wordmark).
 */
export function AuthSideWordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="text-3xl font-bold tracking-tight">Ouiboo</span>
      <BetaBadge />
    </div>
  );
}
