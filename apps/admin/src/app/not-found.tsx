'use client'

import { Shield } from 'lucide-react'
import Link from 'next/link'
import { Button, EmptyState } from '@ouiboo/ui'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-16">
      <EmptyState
        className="w-full border-solid bg-card py-14"
        icon={<Shield className="h-6 w-6 text-primary" aria-hidden="true" />}
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={<Button asChild><Link href="/">{t('notFound.back')}</Link></Button>}
      />
    </main>
  )
}