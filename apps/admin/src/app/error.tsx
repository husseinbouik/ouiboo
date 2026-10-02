'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, EmptyState } from '@ouiboo/ui'
import { useTranslation } from 'react-i18next'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useTranslation()

  useEffect(() => {
    console.error('Unhandled admin route error', error)
  }, [error])

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-16">
      <EmptyState
        className="w-full border-solid bg-card py-14"
        icon={<AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />}
        title={t('error.title')}
        description={t('error.description')}
        action={<Button type="button" onClick={reset}>{t('error.retry')}</Button>}
      />
    </main>
  )
}
