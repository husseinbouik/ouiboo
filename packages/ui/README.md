# @ouiboo/ui

Reusable UI primitives for Ouiboo apps. Import from `@ouiboo/ui` and compose in each application.

## Components

- `Dialog` / `Modal`
- `Toast`
- `EmptyState`
- `Skeleton`
- `FormField`

## Usage

### Dialog / Modal

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Modal,
} from '@ouiboo/ui'

export function ExampleDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>Double-check before continuing.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary">Cancel</Button>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ExampleModal({ open, onOpenChange }) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Invite teammate"
      description="Send an invite by email."
      footer={<Button>Send invite</Button>}
    >
      <p className="text-sm text-muted-foreground">
        This modal wraps the dialog primitive with a header and footer layout.
      </p>
    </Modal>
  )
}
```

### Toast

```tsx
import { Toast, ToastTitle, ToastDescription } from '@ouiboo/ui'

export function ExampleToast() {
  return (
    <Toast variant="success">
      <ToastTitle>Invite sent</ToastTitle>
      <ToastDescription>The teammate will receive an email shortly.</ToastDescription>
    </Toast>
  )
}
```

### EmptyState

```tsx
import { EmptyState, Button } from '@ouiboo/ui'

export function ExampleEmpty() {
  return (
    <EmptyState
      title="No trips yet"
      description="Create a new trip to start organizing your travel plans."
      action={<Button>Create trip</Button>}
    />
  )
}
```

### Skeleton

```tsx
import { Skeleton } from '@ouiboo/ui'

export function ExampleSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}
```

### FormField

```tsx
import { FormField, Input } from '@ouiboo/ui'

export function ExampleField() {
  return (
    <FormField
      label="Email"
      hint="Work email only"
      error="Please enter a valid email"
      htmlFor="email"
      required
    >
      <Input id="email" placeholder="name@company.com" />
    </FormField>
  )
}
```

## Touch targets (44px minimum hit area)

Every interactive control must expose a hit area of at least 44x44px
(Apple HIG / WCAG guidance), even when the visual stays compact:

- If the control itself is >= 44px, nothing to do.
- If an icon-only control is smaller, keep its visual size and add the
  `hit-slop` utility (defined in `@ouiboo/tokens/tokens.css`). It grows
  the tappable box to at least 44x44 via a centered pseudo-element
  without changing layout. Do not combine it with `overflow-hidden` on
  the same element — that clips the expanded hit area.
- Prefer real size (padding) over `hit-slop` when the layout has room;
  use `hit-slop` for overlays and fixed chrome (card arrows, navbar
  buttons, dialog/drawer close buttons).

## Safe-area insets

Apps set `viewport-fit=cover`, so on notched devices the
`env(safe-area-inset-*)` values are real. Sticky/fixed bottom bars,
sheet/drawer footers, and bottom-anchored CTAs must clear the home
indicator using the shared utilities from `@ouiboo/tokens/tokens.css`:
`pb-safe` / `pt-safe` (inset only) or `pb-safe-3` / `pb-safe-4` /
`pb-safe-5` (0.75rem / 1rem / 1.25rem of base spacing plus the inset).
Do not hand-write `env(safe-area-inset-...)` arbitrary values in
components.
