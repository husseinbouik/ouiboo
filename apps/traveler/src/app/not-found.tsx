import { Compass } from 'lucide-react'
import Link from 'next/link'
import { Button, EmptyState } from '@ouiboo/ui'

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-24">
      <EmptyState
        className="w-full border-solid bg-card py-16"
        icon={<Compass className="h-6 w-6 text-primary" aria-hidden="true" />}
        title="This route is not on the map"
        description="The page may have moved or the trip may no longer be available."
        action={<Button asChild><Link href="/search">Explore available trips</Link></Button>}
      />
    </main>
  )
}
