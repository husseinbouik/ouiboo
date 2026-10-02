'use client'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error('Unhandled landing route error', error)
  }, [error])

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="max-w-lg rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-orange-400">Ouiboo</p>
        <h1 className="mt-4 text-3xl font-bold">{t('error.title')}</h1>
        <p className="mt-3 text-slate-300">{t('error.description')}</p>
        <button type="button" onClick={reset} className="mt-7 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
          {t('error.tryAgain')}
        </button>
      </div>
    </main>
  )
}
