'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState } from '@ouiboo/ui'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useTranslation()

  useEffect(() => {
    console.error('Unhandled traveler route error', error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-24">
      <EmptyState
        className="w-full border-solid bg-card py-16"
        icon={<AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />}
        title={t('common.errorTitle')}
        description={t('common.errorDescription')}
        action={(
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" onClick={reset}>{t('common.tryAgain')}</Button>
            <Button asChild variant="outline"><Link href="/search">{t('common.browseTrips')}</Link></Button>
          </div>
        )}
      />
    </main>
  )
}
