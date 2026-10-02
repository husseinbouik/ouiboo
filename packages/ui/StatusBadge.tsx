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
import { cn } from './utils'

export type StatusBadgeDomain =
  | 'booking'
  | 'payment'
  | 'verification'
  | 'payout'

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'
type StatusDefinition = { label?: string; tone: StatusTone; icon: LucideIcon }

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

const commonStatuses: Record<string, StatusDefinition> = {
  CONFIRMED: { tone: 'success', icon: CheckCircle2 },
  APPROVED: { tone: 'success', icon: CheckCircle2 },
  COMPLETED: { tone: 'success', icon: CheckCircle2 },
  ACTIVE: { tone: 'success', icon: CheckCircle2 },
  PAID: { tone: 'success', icon: CircleDollarSign },
  PENDING: { tone: 'warning', icon: Clock3 },
  AWAITING_VALIDATION: { tone: 'warning', icon: Clock3 },
  PROCESSING: { tone: 'info', icon: LoaderCircle },
  VERIFIED: { tone: 'success', icon: ShieldCheck },
  REJECTED: { tone: 'danger', icon: XCircle },
  FAILED: { tone: 'danger', icon: XCircle },
  CANCELLED: { tone: 'danger', icon: Ban },
  CANCELED: { tone: 'danger', icon: Ban },
}

const domainStatuses: Record<
  StatusBadgeDomain,
  Record<string, Partial<StatusDefinition>>
> = {
  booking: {
    AWAITING_VALIDATION: { label: 'Awaiting validation' },
  },
  payment: {
    PENDING: { label: 'Payment pending' },
    PAID: { label: 'Paid' },
  },
  verification: {
    PENDING: { label: 'Verification pending' },
    VERIFIED: { label: 'Verified' },
  },
  payout: {
    PENDING: { label: 'Payout pending' },
    PROCESSING: { label: 'Payout processing' },
    PAID: { label: 'Paid out' },
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
  const fallback: StatusDefinition = { tone: 'neutral', icon: Clock3 }
  const definition = {
    ...fallback,
    ...commonStatuses[normalizedStatus],
    ...domainStatuses[domain][normalizedStatus],
  }
  const Icon = definition.icon
  const accessibleLabel =
    label || definition.label || humanizeStatus(normalizedStatus)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none',
        toneClasses[definition.tone],
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
