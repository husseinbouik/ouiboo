import { Building2 } from 'lucide-react'
import Link from 'next/link'
import { Button, EmptyState } from '@ouiboo/ui'

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[65vh] max-w-3xl items-center px-4 py-16">
      <EmptyState
        className="w-full border-solid bg-card py-14"
        icon={<Building2 className="h-6 w-6 text-primary" aria-hidden="true" />}
        title="Page not found"
        description="The requested agency workspace page does not exist or has moved."
        action={<Button asChild><Link href="/dashboard">Return to dashboard</Link></Button>}
      />
    </main>
  )
}
