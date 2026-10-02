'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState } from '@ouiboo/ui'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useTranslation()

  useEffect(() => {
    console.error('Unhandled agency route error', error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-3xl items-center px-4 py-16">
      <EmptyState
        className="w-full border-solid bg-card py-14"
        icon={<AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />}
        title={t('routeError.title')}
        description={t('routeError.description')}
        action={<Button type="button" onClick={reset}>{t('routeError.retry')}</Button>}
      />
    </main>
  )
}
