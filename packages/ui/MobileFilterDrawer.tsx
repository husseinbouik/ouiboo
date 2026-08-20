'use client'

import * as React from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { Button } from './Button'
import { cn } from './utils'

export interface MobileFilterDrawerProps {
  children: React.ReactNode
  title?: string
  description?: string
  triggerLabel?: string
  trigger?: React.ReactNode
  footer?: React.ReactNode
  side?: 'left' | 'right'
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export function MobileFilterDrawer({
  children,
  title = 'Filters',
  description = 'Refine the results using the options below.',
  triggerLabel = 'Filters',
  trigger,
  footer,
  side = 'right',
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
}: MobileFilterDrawerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  const titleId = React.useId()
  const descriptionId = React.useId()
  const closeButtonRef = React.useRef<HTMLButtonElement>(null)

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [controlledOpen, onOpenChange]
  )

  React.useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    closeButtonRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, setOpen])

  return (
    <>
      <div className="md:hidden">
        {trigger ? (
          <span
            role="button"
            tabIndex={0}
            onClick={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') setOpen(true)
            }}
          >
            {trigger}
          </span>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {triggerLabel}
          </Button>
        )}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className={cn(
              'absolute inset-y-0 flex w-[min(90vw,24rem)] flex-col bg-background shadow-2xl',
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              className
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b p-5">
              <div className="space-y-1">
                <h2 id={titleId} className="text-lg font-bold text-foreground">
                  {title}
                </h2>
                <p
                  id={descriptionId}
                  className="text-sm text-muted-foreground"
                >
                  {description}
                </p>
              </div>
              <Button
                ref={closeButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </header>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
            {footer ? <footer className="border-t p-5">{footer}</footer> : null}
          </section>
        </div>
      ) : null}
    </>
  )
}
