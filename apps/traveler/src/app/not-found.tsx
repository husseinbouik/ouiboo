'use client'

import { Compass } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState } from '@ouiboo/ui'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-24">
      <EmptyState
        className="w-full border-solid bg-card py-16"
        icon={<Compass className="h-6 w-6 text-primary" aria-hidden="true" />}
        title={t('common.notFoundTitle', 'This route is not on the map')}
        description={t('common.notFoundDescription', 'The page may have moved or the trip may no longer be available.')}
        action={<Button asChild><Link href="/search">{t('common.exploreTrips', 'Explore available trips')}</Link></Button>}
      />
    </main>
  )
}
