'use client'

import { Building2 } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState } from '@ouiboo/ui'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-3xl items-center px-4 py-16">
      <EmptyState
        className="w-full border-solid bg-card py-14"
        icon={<Building2 className="h-6 w-6 text-primary" aria-hidden="true" />}
        title={t('notFoundPage.title')}
        description={t('notFoundPage.description')}
        action={<Button asChild><Link href="/dashboard">{t('notFoundPage.cta')}</Link></Button>}
      />
    </main>
  )
}
