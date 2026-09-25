'use client'

import { useTranslation } from 'react-i18next'

export default function AgencyLoading() {
  const { t } = useTranslation()

  return (
    <div
      className="animate-pulse space-y-8 p-6 lg:p-8"
      role="status"
      aria-label={t('common.loading')}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="h-8 w-56 rounded-xl bg-muted" />
          <div className="h-4 w-80 max-w-full rounded bg-muted/70" />
        </div>
        <div className="h-11 w-32 rounded-xl bg-muted" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 rounded-3xl border border-border bg-card"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="h-96 rounded-3xl border border-border bg-card" />
        <div className="h-96 rounded-3xl border border-border bg-card" />
      </div>
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}
