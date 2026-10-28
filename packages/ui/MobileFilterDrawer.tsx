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
  hideAt?: 'md' | 'lg'
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  closeLabel?: string
}

/** #489: release past this fraction of the panel width dismisses it. */
export const DRAWER_SWIPE_DISMISS_FRACTION = 0.3
/** #489: or flick it — velocity in px/ms toward the closing edge. */
export const DRAWER_SWIPE_DISMISS_VELOCITY = 0.5

interface DragState {
  pointerId: number
  startX: number
  startY: number
  /** +1 when closing means moving right, -1 when it means moving left. */
  closeSign: 1 | -1
  decided: boolean
  distance: number
  lastX: number
  lastT: number
  velocity: number
}

export function MobileFilterDrawer({
  children,
  title = 'Filters',
  description = 'Refine the results using the options below.',
  triggerLabel = 'Filters',
  trigger,
  footer,
  side = 'right',
  hideAt = 'md',
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
  closeLabel = 'Close filters',
}: MobileFilterDrawerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  const titleId = React.useId()
  const descriptionId = React.useId()
  const closeButtonRef = React.useRef<HTMLButtonElement>(null)
  const triggerButtonRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLElement>(null)
  const dragRef = React.useRef<DragState | null>(null)
  // #489: live drag distance toward the closing edge (px, >= 0) and
  // whether the finger is currently down (no snap transition while held).
  const [dragDistance, setDragDistance] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const responsiveClass = hideAt === 'lg' ? 'lg:hidden' : 'md:hidden'

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
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    closeButtonRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      triggerButtonRef.current?.focus()
    }
  }, [open, setOpen])

  // #489: swipe-to-dismiss. The panel follows the finger toward its own
  // edge (decided from the panel's live position, so RTL mirrors for
  // free); releasing past the distance or velocity threshold dismisses,
  // releasing below it snaps back. All pre-existing dismissal paths
  // (backdrop tap, close button, Esc) are untouched, and focus/aria
  // management is unchanged. The gesture only engages on a
  // horizontal-dominant move, and the panel keeps `touch-pan-y`, so
  // vertical scrolling inside the drawer is never hijacked.
  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.isPrimary === false || dragRef.current) return
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const closeSign: 1 | -1 =
      rect.left + rect.width / 2 >= window.innerWidth / 2 ? 1 : -1
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      closeSign,
      decided: false,
      distance: 0,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.decided) {
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return
      drag.decided = true
      setIsDragging(true)
      try {
        panelRef.current?.setPointerCapture?.(event.pointerId)
      } catch {
        // jsdom / older engines: capture is an optimisation, not a need.
      }
    }
    const dt = Math.max(1, event.timeStamp - drag.lastT)
    drag.velocity = (event.clientX - drag.lastX) / dt
    drag.lastX = event.clientX
    drag.lastT = event.timeStamp
    const panelWidth = panelRef.current?.offsetWidth || 320
    const towardClose = dx * drag.closeSign
    drag.distance = Math.min(panelWidth, Math.max(0, towardClose))
    setDragDistance(drag.distance)
  }

  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    dragRef.current = null
    setIsDragging(false)
    if (!drag.decided) {
      setDragDistance(0)
      return
    }
    const panelWidth = panelRef.current?.offsetWidth || 320
    const flicked = drag.velocity * drag.closeSign > DRAWER_SWIPE_DISMISS_VELOCITY
    const farEnough =
      drag.distance > panelWidth * DRAWER_SWIPE_DISMISS_FRACTION
    setDragDistance(0)
    if (flicked || farEnough) {
      setOpen(false)
    }
  }

  const panelWidthForProgress = panelRef.current?.offsetWidth || 320
  const dragProgress = Math.min(1, dragDistance / panelWidthForProgress)
  const dragSign = dragRef.current?.closeSign ?? (side === 'right' ? 1 : -1)

  return (
    <>
      <div className={responsiveClass}>
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
            ref={triggerButtonRef}
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
        <div className={cn('fixed inset-0 z-50', responsiveClass)}>
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            style={{ opacity: 1 - dragProgress * 0.6 }}
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
          />
          <section
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            data-swipe-dismiss="true"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{
              transform:
                dragDistance > 0
                  ? `translateX(${dragDistance * dragSign}px)`
                  : undefined,
              transition: isDragging
                ? 'none'
                : 'transform 200ms ease-out',
            }}
            className={cn(
              'absolute inset-y-0 flex w-[min(90vw,24rem)] flex-col bg-background shadow-2xl touch-pan-y motion-reduce:transition-none',
              side === 'right' ? 'end-0 border-s' : 'start-0 border-e',
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
                className="hit-slop"
                onClick={() => setOpen(false)}
                aria-label={closeLabel}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </header>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
            {footer ? <footer className="border-t px-5 pt-5 pb-safe-5">{footer}</footer> : null}
          </section>
        </div>
      ) : null}
    </>
  )
}
