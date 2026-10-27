'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { cn } from './utils'

/**
 * #487: shared command palette (⌘K / Ctrl+K) for the operator apps
 * (agency + admin). Deliberately dependency-free: the repo has no
 * command-menu library, and this surface only needs fuzzy filtering,
 * keyboard-first navigation and correct dialog semantics — all of
 * which are implemented here and covered by CommandPalette.test.tsx.
 *
 * v1 is navigation-only: items carry a `perform` callback supplied by
 * the host app, which is responsible for listing only what the signed-in
 * user is permitted to open (role/permission filtering lives with the
 * caller, never here).
 */
export interface CommandPaletteItem {
  id: string
  label: string
  /** Section heading the item is grouped under (already localised). */
  group?: string
  /** Extra words matched by the fuzzy filter (ids, statuses, …). */
  keywords?: string
  /** Optional trailing hint, e.g. a count or a shortcut. */
  hint?: string
  perform: () => void
}

export interface CommandPaletteProps {
  items: CommandPaletteItem[]
  /** Localised strings, supplied by the host app (en/fr/ar parity). */
  placeholder: string
  emptyText: string
  ariaLabel: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Render the built-in trigger button (with the ⌘K kbd hint). */
  withTrigger?: boolean
  triggerLabel?: string
  triggerClassName?: string
}

/** Subsequence fuzzy match: returns a score (lower is better) or -1. */
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase()
  if (!q) return 0
  const t = text.toLowerCase()
  let qi = 0
  let score = 0
  let lastMatch = -1
  for (let ti = 0; ti < t.length && qi < q.length; ti += 1) {
    if (t[ti] === q[qi]) {
      score += lastMatch === -1 ? ti : ti - lastMatch - 1
      lastMatch = ti
      qi += 1
    }
  }
  return qi === q.length ? score : -1
}

export function filterCommandItems(
  items: CommandPaletteItem[],
  query: string,
): CommandPaletteItem[] {
  if (!query.trim()) return items
  return items
    .map((item) => ({
      item,
      score: fuzzyScore(query, `${item.label} ${item.keywords ?? ''}`),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.item)
}

export function CommandPalette({
  items,
  placeholder,
  emptyText,
  ariaLabel,
  open: openProp,
  onOpenChange,
  withTrigger = false,
  triggerLabel,
  triggerClassName,
}: CommandPaletteProps) {
  const [openState, setOpenState] = React.useState(false)
  const open = openProp ?? openState
  const setOpen = React.useCallback(
    (next: boolean) => {
      setOpenState(next)
      onOpenChange?.(next)
    },
    [onOpenChange],
  )
  const [query, setQuery] = React.useState('')
  const [activeIndex, setActiveIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const restoreFocusRef = React.useRef<HTMLElement | null>(null)

  const filtered = React.useMemo(
    () => filterCommandItems(items, query),
    [items, query],
  )

  // Global ⌘K / Ctrl+K opens (and toggles) the palette from anywhere in
  // the host app. The traveller app never mounts this component.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  React.useEffect(() => {
    if (!open) return
    restoreFocusRef.current = document.activeElement as HTMLElement | null
    setQuery('')
    setActiveIndex(0)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => {
      window.clearTimeout(timer)
      restoreFocusRef.current?.focus?.()
    }
  }, [open ])

  React.useEffect(() => {
    setActiveIndex(0)
  }, [query])

  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    )
    el?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex])

  const runItem = React.useCallback(
    (item: CommandPaletteItem | undefined) => {
      if (!item) return
      setOpen(false)
      item.perform()
    },
    [setOpen],
  )

  const onInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      runItem(filtered[activeIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'Home') {
      setActiveIndex(0)
    } else if (event.key === 'End') {
      setActiveIndex(Math.max(filtered.length - 1, 0))
    }
  }

  let lastGroup: string | undefined
  return (
    <>
      {withTrigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={ariaLabel}
          className={cn(
            'flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm transition-colors hover:text-foreground',
            triggerClassName,
          )}
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="hidden lg:inline">{triggerLabel ?? placeholder}</span>
          <kbd className="oui-kbd" aria-hidden="true">
            ⌘K
          </kbd>
        </button>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={placeholder}
                aria-label={ariaLabel}
                role="combobox"
                aria-expanded="true"
                aria-controls="oui-command-listbox"
                aria-activedescendant={
                  filtered[activeIndex]
                    ? `oui-command-${filtered[activeIndex].id}`
                    : undefined
                }
                className="min-h-11 w-full bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="oui-kbd" aria-hidden="true">
                esc
              </kbd>
            </div>
            <ul
              ref={listRef}
              id="oui-command-listbox"
              role="listbox"
              aria-label={ariaLabel}
              className="max-h-[50vh] overflow-y-auto p-2"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {emptyText}
                </li>
              ) : (
                filtered.map((item, index) => {
                  const showGroup = item.group && item.group !== lastGroup
                  lastGroup = item.group
                  return (
                    <React.Fragment key={item.id}>
                      {showGroup ? (
                        <li
                          aria-hidden="true"
                          className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                        >
                          {item.group}
                        </li>
                      ) : null}
                      <li
                        id={`oui-command-${item.id}`}
                        data-index={index}
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => runItem(item)}
                        className={cn(
                          'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground',
                          index === activeIndex && 'bg-muted',
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.hint ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {item.hint}
                          </span>
                        ) : null}
                      </li>
                    </React.Fragment>
                  )
                })
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  )
}
