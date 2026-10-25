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

/**
 * Skeleton rows for use inside a real <tbody>, so an agency table keeps
 * its header and column layout while data loads (#469). Pair with
 * aria-busy="true" on the <table> while loading.
 */
export function TableBodySkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-1/3', 'w-3/5', 'w-1/2'];
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} aria-hidden="true">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-5">
              <Skeleton className={cn('h-4', widths[(rowIndex + colIndex) % widths.length])} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Label + field blocks for form pages that load their initial values
 * (e.g. the trip edit form) (#469).
 */
export function FormSkeleton({
  fields = 6,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-8', className)} aria-hidden="true">
      <div className="space-y-3">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}
