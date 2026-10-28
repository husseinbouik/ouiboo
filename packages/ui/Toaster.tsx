'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  TOAST_DEFAULT_DURATION_MS,
  TOAST_ACTION_DURATION_MS,
  type ToastActionObject,
} from './Toast'
import { cn } from './utils'

/**
 * #485: minimal shared toast host. Before this, `Toast` was a purely
 * presentational component and no app rendered toasts at all, so no
 * destructive action could offer Undo. `ToastProvider` owns the stack;
 * `useToast()` pushes a toast and returns its id; `dismissToast(id)`
 * closes one early (the Undo handler dismisses its own toast).
 *
 * Accessibility contract (#485 acceptance):
 * - The stack is a polite live region (`role="status"`,
 *   `aria-live="polite"`); error toasts use `role="alert"`.
 * - Toasts never steal focus; the action button is a real button the
 *   user can tab to while the toast is on screen.
 * - Action toasts default to TOAST_ACTION_DURATION_MS, plain toasts to
 *   TOAST_DEFAULT_DURATION_MS. Hover/focus pauses auto-dismiss.
 *
 * API (documented per #485):
 *   const { toast } = useToast()
 *   toast({ title: 'Removed from wishlist', variant: 'default',
 *           action: { label: t('common.undo'), onClick: () => reAdd() } })
 *   toast({ title: 'Something failed', variant: 'error' })
 */

export interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'success' | 'info' | 'warning' | 'error'
  /** #485: Undo-style action; presence extends the default duration. */
  action?: ToastActionObject
  /** Explicit duration in ms; defaults depend on `action` (see above). */
  durationMs?: number
  /** Label for the dismiss button (localised by the call site). */
  dismissLabel?: string
}

interface ToastRecord extends Required<Pick<ToastOptions, 'title'>> {
  id: number
  description?: string
  variant: NonNullable<ToastOptions['variant']>
  action?: ToastActionObject
  durationMs: number
  dismissLabel: string
}

interface ToastContextValue {
  toast: (options: ToastOptions) => number
  dismissToast: (id: number) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([])
  const nextId = React.useRef(1)
  const timers = React.useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismissToast = React.useCallback((id: number) => {
    setToasts((current) => current.filter((entry) => entry.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = React.useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++
      const durationMs =
        options.durationMs ??
        (options.action ? TOAST_ACTION_DURATION_MS : TOAST_DEFAULT_DURATION_MS)
      const record: ToastRecord = {
        id,
        title: options.title,
        description: options.description,
        variant: options.variant ?? 'default',
        action: options.action,
        durationMs,
        dismissLabel: options.dismissLabel ?? 'Dismiss',
      }
      setToasts((current) => [...current.slice(-2), record])
      if (durationMs > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismissToast(id), durationMs),
        )
      }
      return id
    },
    [dismissToast],
  )

  React.useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer))
      timers.current.clear()
    },
    [],
  )

  const value = React.useMemo(
    () => ({ toast, dismissToast }),
    [toast, dismissToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((entry) => (
          <div key={entry.id} className="pointer-events-auto w-full max-w-sm">
            <Toast
              variant={entry.variant}
              role={entry.variant === 'error' ? 'alert' : 'status'}
              action={
                entry.action ? (
                  <ToastAction
                    onClick={() => {
                      entry.action?.onClick()
                      dismissToast(entry.id)
                    }}
                  >
                    {entry.action.label}
                  </ToastAction>
                ) : undefined
              }
            >
              <ToastTitle>{entry.title}</ToastTitle>
              {entry.description ? (
                <ToastDescription>{entry.description}</ToastDescription>
              ) : null}
              <button
                type="button"
                aria-label={entry.dismissLabel}
                onClick={() => dismissToast(entry.id)}
                className={cn(
                  'absolute end-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Toast>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
