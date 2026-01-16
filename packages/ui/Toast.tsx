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

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  icon?: React.ReactNode
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, icon, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      {icon ? <div className="mt-0.5 flex-shrink-0">{icon}</div> : null}
      <div className="flex-1 space-y-1">{children}</div>
    </div>
  )
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

export { Toast, ToastTitle, ToastDescription, toastVariants }
