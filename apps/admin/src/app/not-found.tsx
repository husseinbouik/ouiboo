import { Shield } from 'lucide-react'
import Link from 'next/link'
import { Button, EmptyState } from '@ouiboo/ui'

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-16">
      <EmptyState
        className="w-full border-solid bg-card py-14"
        icon={<Shield className="h-6 w-6 text-primary" aria-hidden="true" />}
        title="Administration page not found"
        description="The requested tool does not exist or is no longer available."
        action={<Button asChild><Link href="/">Return to administration</Link></Button>}
      />
    </main>
  )
}
