import * as React from 'react'
import { cn } from './utils'
import { Skeleton } from './Skeleton'

/**
 * Loading skeletons matching content shapes.
 * Use these instead of blank states or generic spinners (#79, #469).
 *
 * Every skeleton mirrors the layout and fixed dimensions of the content it
 * stands in for, so real content swaps in place with no layout shift.
 * Skeletons are decorative: they are aria-hidden and the wrapping surface
 * announces loading via role="status" (see the apps' loading branches).
 * The pulse animation lives on the Skeleton primitive as
 * `motion-safe:animate-pulse`, so it is disabled under
 * prefers-reduced-motion.
 */


/**
 * App-specific skeletons live with their only consumer, following the
 * repo pattern for page-shaped components: traveller booking/checkout/
 * review skeletons in apps/traveler/src/components/Skeletons.tsx, agency
 * table/form skeletons in apps/agency/src/components/Skeletons.tsx.
 */
export function TripCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm',
        className,
      )}
      aria-hidden="true"
    >
      {/* Image area — matches TripCard's h-64 carousel, badges included. */}
      <div className="relative h-64 shrink-0">
        <Skeleton className="h-full w-full rounded-none" />
        <Skeleton className="absolute start-3 top-3 h-6 w-20 rounded-lg bg-card/70" />
        <Skeleton className="absolute end-14 top-3 h-6 w-24 rounded-lg bg-card/70" />
        <Skeleton className="absolute end-3 top-3 h-9 w-9 rounded-full bg-card/70" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-12 shrink-0 rounded-md" />
          </div>
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function TripCardSkeletonGrid({
  count = 6,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3', className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <TripCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-6', className)} aria-hidden="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-2 h-3 w-40" />
    </div>
  )
}

export function DashboardStatsSkeleton({
  count = 4,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function TripDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('', className)} aria-hidden="true">
      {/* Back link */}
      <Skeleton className="mb-5 h-10 w-40 rounded-xl sm:mb-8" />

      {/* Gallery — mirrors the detail page's gallery grid. */}
      <div className="mb-8 grid h-auto grid-cols-1 gap-4 sm:mb-12 md:gap-6 lg:h-[600px] lg:grid-cols-12">
        <Skeleton className="h-[280px] rounded-[1.5rem] sm:h-[400px] sm:rounded-[2rem] lg:col-span-7 lg:h-full" />
        <div className="hidden grid-cols-2 gap-4 md:gap-6 lg:col-span-5 lg:grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="min-h-36 rounded-[1.5rem]" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-16">
        {/* Main column: badges/title, description, info blocks. */}
        <div className="space-y-12 lg:col-span-2">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-12 w-4/5 md:h-16" />
            <Skeleton className="h-8 w-44 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </div>

        {/* Booking panel */}
        <div className="h-fit space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="mx-auto h-3 w-2/3" />
        </div>
      </div>
    </div>
  )
}

export function CardListSkeleton({
  rows = 5,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-9 w-24 shrink-0 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Divided list rows with an avatar circle — for review lists and other
 * simple stacked rows.
 */
