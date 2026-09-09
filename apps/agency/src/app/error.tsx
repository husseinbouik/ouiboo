'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, EmptyState } from '@ouiboo/ui'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled agency route error', error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-3xl items-center px-4 py-16">
      <EmptyState
        className="w-full border-solid bg-card py-14"
        icon={<AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />}
        title="This workspace could not load"
        description="Try the page again. Your saved agency data has not been changed."
        action={<Button type="button" onClick={reset}>Try again</Button>}
      />
    </main>
  )
}
