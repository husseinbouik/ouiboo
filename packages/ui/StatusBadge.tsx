import * as React from 'react'
import {
  Ban,
  CheckCircle2,
  Clock3,
  CircleDollarSign,
  LoaderCircle,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { getStatusTone, type StatusDomain, type StatusTone } from '@ouiboo/utils'
import { cn } from './utils'

/**
 * The shared status badge (#1029, finding D4).
 *
 * The tone for every status now comes from the single registry in
 * `@ouiboo/utils` (`status-meta.ts`) — this component previously
 * carried its own private copy of the map, one of three parallel
 * status systems. It keeps only presentation: the pill chrome, its
 * tone classes, icons, and a few domain label overrides. Per-audience
 * wording still wins: pass `label` (e.g. an i18n string) and it is
 * used verbatim.
 */
export type StatusBadgeDomain = StatusDomain

const toneClasses: Record<StatusTone, string> = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  danger:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
  info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200',
  neutral:
    'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
}

const toneIcons: Record<StatusTone, LucideIcon> = {
  success: CheckCircle2,
  warning: Clock3,
  danger: XCircle,
  info: LoaderCircle,
  neutral: Clock3,
}

const statusIcons: Record<string, LucideIcon> = {
  PAID: CircleDollarSign,
  VERIFIED: ShieldCheck,
  PROCESSING: LoaderCircle,
  CANCELLED: Ban,
  CANCELED: Ban,
}

const domainLabels: Partial<Record<StatusBadgeDomain, Record<string, string>>> = {
  booking: {
    AWAITING_VALIDATION: 'Awaiting validation',
  },
  payment: {
    PENDING: 'Payment pending',
    PAID: 'Paid',
  },
  verification: {
    PENDING: 'Verification pending',
    VERIFIED: 'Verified',
  },
  payout: {
    PENDING: 'Payout pending',
    PROCESSING: 'Payout processing',
    PAID: 'Paid out',
  },
}

const humanizeStatus = (status: string) =>
  status
    .trim()
    .replace(/[-_\s]+/g, ' ')
    .toLocaleLowerCase()
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase())

export interface StatusBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  status: string
  domain: StatusBadgeDomain
  label?: string
  showIcon?: boolean
}

export function StatusBadge({
  status,
  domain,
  label,
  showIcon = true,
  className,
  ...props
}: StatusBadgeProps) {
  const normalizedStatus = status.trim().toLocaleUpperCase()
  const tone = getStatusTone(domain, normalizedStatus)
  const Icon = statusIcons[normalizedStatus] ?? toneIcons[tone]
  const accessibleLabel =
    label || domainLabels[domain]?.[normalizedStatus] || humanizeStatus(normalizedStatus)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none',
        toneClasses[tone],
        className
      )}
      aria-label={`${domain}: ${accessibleLabel}`}
      data-domain={domain}
      data-status={normalizedStatus}
      {...props}
    >
      {showIcon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      <span>{accessibleLabel}</span>
    </span>
  )
}
