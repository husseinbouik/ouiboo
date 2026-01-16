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
