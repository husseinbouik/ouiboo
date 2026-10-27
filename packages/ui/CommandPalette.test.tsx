/**
 * @jest-environment jsdom
 */
import * as React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  CommandPalette,
  filterCommandItems,
  fuzzyScore,
  type CommandPaletteItem,
} from './CommandPalette'

const items: CommandPaletteItem[] = [
  { id: 'dash', label: 'Dashboard', group: 'Go to', perform: jest.fn() },
  { id: 'trip-1', label: 'Sahara Nights', group: 'Trips', keywords: 'trip draft', perform: jest.fn() },
  { id: 'trip-2', label: 'Atlas Trek', group: 'Trips', keywords: 'trip published', perform: jest.fn() },
]

describe('fuzzyScore / filterCommandItems (#487)', () => {
  it('matches subsequences case-insensitively and rejects misses', () => {
    expect(fuzzyScore('shr', 'Sahara Nights')).toBeGreaterThanOrEqual(0)
    expect(fuzzyScore('zzz', 'Sahara Nights')).toBe(-1)
    expect(filterCommandItems(items, 'atlas').map((i) => i.id)).toEqual(['trip-2'])
    expect(filterCommandItems(items, '')).toHaveLength(3)
  })
})

describe('CommandPalette (#487)', () => {
  it('opens on Cmd+K, filters, Enter runs the active item, Esc closes and restores focus', () => {
    const onRun = jest.fn()
    const localItems = items.map((i) => ({ ...i, perform: jest.fn() }))
    localItems[1].perform = onRun
    render(
      <>
        <button type="button">outside</button>
        <CommandPalette
          items={localItems}
          placeholder="Search…"
          emptyText="No results"
          ariaLabel="Command palette"
          withTrigger
          triggerLabel="Search"
        />
      </>,
    )
    const outside = screen.getByText('outside')
    outside.focus()
    fireEvent.keyDown(document, { key: 'k', metaKey: true })
    const input = screen.getByPlaceholderText('Search…')
    expect(input).toBeTruthy()
    fireEvent.change(input, { target: { value: 'sahara' } })
    expect(screen.getByText('Sahara Nights')).toBeTruthy()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRun).toHaveBeenCalledTimes(1)
    // Reopen and close with Escape; focus returns to the outside button.
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    fireEvent.keyDown(screen.getByPlaceholderText('Search…'), { key: 'Escape' })
    expect(screen.queryByPlaceholderText('Search…')).toBeNull()
    expect(document.activeElement).toBe(outside)
  })

  it('shows the empty text when nothing matches', () => {
    render(
      <CommandPalette
        items={items}
        placeholder="Search…"
        emptyText="No results"
        ariaLabel="Command palette"
        open
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('Search…'), {
      target: { value: 'qqqq' },
    })
    expect(screen.getByText('No results')).toBeTruthy()
  })
})
