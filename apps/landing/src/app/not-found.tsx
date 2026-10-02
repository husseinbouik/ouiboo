'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="max-w-lg rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-orange-400">404 · Ouiboo</p>
        <h1 className="mt-4 text-3xl font-bold">{t('notFound.title')}</h1>
        <p className="mt-3 text-slate-300">{t('notFound.description')}</p>
        <Link href="/" className="mt-7 inline-flex rounded-xl bg-orange-500 px-6 py-3 font-bold text-white transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
          {t('notFound.returnHome')}
        </Link>
      </div>
    </main>
  )
}