'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

const toastVariants = cva(
  'relative flex w-full items-start gap-3 rounded-xl border border-border bg-background p-4 text-sm shadow-sm',
  {
    variants: {
      variant: {
        default: 'text-foreground',
        success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
        info: 'border-sky-500/30 bg-sky-500/10 text-sky-700',
        warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
        error: 'border-red-500/30 bg-red-500/10 text-red-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

/**
 * #485: how long a toast stays on screen. Toasts carrying an action
 * (e.g. Undo) get a longer window so the action is actually reachable —
 * including by keyboard users — before it vanishes.
 */
export const TOAST_DEFAULT_DURATION_MS = 4000
export const TOAST_ACTION_DURATION_MS = 8000

/** #485: an optional action rendered inside a toast (label + handler). */
export interface ToastActionObject {
  label: string
  onClick: () => void
}

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  icon?: React.ReactNode
  /**
   * #485: optional action (e.g. Undo for a destructive action). Accepts
   * either a `{ label, onClick }` object or a rendered <ToastAction>.
   * The action button is focusable and announced with the toast, but the
   * toast never steals focus — keyboard users reach it by tabbing.
   * Existing call sites that pass no action render exactly as before.
   */
  action?: ToastActionObject | React.ReactNode
}

function isActionObject(action: unknown): action is ToastActionObject {
  return (
    typeof action === 'object' &&
    action !== null &&
    'label' in (action as Record<string, unknown>) &&
    'onClick' in (action as Record<string, unknown>)
  )
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, icon, action, children, ...props }, ref) => {
    const actionNode = isActionObject(action) ? (
      <ToastAction onClick={action.onClick}>{action.label}</ToastAction>
    ) : (
      (action as React.ReactNode)
    )
    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        {icon ? <div className="mt-0.5 flex-shrink-0">{icon}</div> : null}
        <div className="flex-1 space-y-1">{children}</div>
        {actionNode ? (
          <div className="flex-shrink-0 self-center">{actionNode}</div>
        ) : null}
      </div>
    )
  }
)
Toast.displayName = 'Toast'

const ToastTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('font-semibold', className)} {...props} />
))
ToastTitle.displayName = 'ToastTitle'

const ToastDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm opacity-80', className)} {...props} />
))
ToastDescription.displayName = 'ToastDescription'

/**
 * #485: the action button inside a toast. A real <button> with a 44px
 * minimum touch height (#490) achieved with padding inside the toast's
 * own box — no negative margins, so no global positioning side-effects.
 */
const ToastAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      'inline-flex min-h-[44px] items-center justify-center rounded-lg px-3 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
))
ToastAction.displayName = 'ToastAction'

export { Toast, ToastTitle, ToastDescription, ToastAction, toastVariants }
