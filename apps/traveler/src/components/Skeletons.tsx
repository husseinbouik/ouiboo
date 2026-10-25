'use client';

import { Skeleton } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';

/**
 * Traveller-shaped loading skeletons (#469). These mirror traveller-only
 * layouts (booking cards, booking detail, checkout, review rows), so they
 * live with the traveller app; skeletons shared across apps live in
 * @ouiboo/ui (LoadingSkeletons). All are aria-hidden — the loading surface
 * announces itself via role="status" — and the Skeleton primitive's pulse
 * is disabled under prefers-reduced-motion.
 */

export function BookingCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm', className)}
      aria-hidden="true"
    >
      <div className="flex flex-col md:flex-row">
        <Skeleton className="h-48 w-full rounded-none md:h-auto md:w-72 md:shrink-0" />
        <div className="flex flex-1 flex-col justify-between gap-8 p-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-2/3" />
            <div className="flex flex-wrap gap-6">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BookingListSkeleton({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-6', className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <BookingCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function BookingDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-8', className)} aria-hidden="true">
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
        <div className="flex flex-col lg:flex-row">
          <Skeleton className="h-64 w-full rounded-none lg:h-auto lg:w-96 lg:shrink-0" />
          <div className="flex-1 space-y-8 p-8">
            <Skeleton className="h-9 w-1/2" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CheckoutSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 items-start gap-12 lg:grid-cols-12', className)} aria-hidden="true">
      <div className="space-y-8 lg:col-span-8">
        <div className="space-y-10 rounded-[2.5rem] bg-card p-10 shadow-xl shadow-black/5">
          <div className="space-y-4">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-7 w-48" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          </div>
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      </div>
      <div className="space-y-4 rounded-[2.5rem] bg-card p-8 shadow-xl shadow-black/5 lg:col-span-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/**
 * Divided list rows with an avatar circle — the shape of the trip review
 * list while reviews load.
 */
export function ListRowSkeleton({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('divide-y divide-border', className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 py-5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
