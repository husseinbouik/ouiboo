import * as React from 'react'
import { cn } from './utils'
import { Skeleton } from './Skeleton'

/**
 * Loading skeletons matching content shapes.
 * Use these instead of blank states or generic spinners (#79).
 * All respect prefers-reduced-motion via the animate-pulse utility.
 */

export function TripCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-3xl border border-border bg-card p-4', className)} aria-hidden="true">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-9 w-24 rounded-xl" />
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
    <div className={cn('space-y-6', className)} aria-hidden="true">
      <Skeleton className="h-80 w-full rounded-3xl" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    </div>
  )
}
