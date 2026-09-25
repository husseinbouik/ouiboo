'use client'

import { useTranslation } from 'react-i18next'

export default function AdminLoading() {
  const { t } = useTranslation()

  return (
    <div
      className="mx-auto max-w-[1600px] animate-pulse space-y-7 p-6 lg:p-8"
      role="status"
      aria-label={t('loading.label')}
    >
      <div className="space-y-3">
        <div className="h-9 w-64 rounded-xl bg-muted" />
        <div className="h-4 w-96 max-w-full rounded bg-muted/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 rounded-2xl border border-border bg-card"
          />
        ))}
      </div>
      <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
        <div className="h-11 w-full rounded-xl bg-muted" />
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-14 w-full rounded-xl bg-muted/70" />
        ))}
      </div>
      <span className="sr-only">{t('loading.text')}</span>
    </div>
  )
}