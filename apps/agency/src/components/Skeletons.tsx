'use client';

import { Skeleton } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';

/**
 * Agency trip card skeleton (#469) — mirrors the dashboard trips grid card
 * (h-48 image with a status pill, category + title, duration/sales meta row,
 * price + row actions) so loaded cards swap in with no layout shift.
 */
export function AgencyTripCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm',
        className,
      )}
      aria-hidden="true"
    >
      <div className="relative h-48 shrink-0">
        <Skeleton className="h-full w-full rounded-none" />
        <Skeleton className="absolute end-4 top-4 h-7 w-16 rounded-lg bg-card/70" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-7 w-3/4" />
        <div className="my-4 flex items-center gap-4 border-y border-border py-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="mt-auto flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AgencyTripCardSkeletonGrid({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <AgencyTripCardSkeleton key={i} className={className} />
      ))}
    </>
  );
}
