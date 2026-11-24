'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { LogoLockup } from '@ouiboo/ui'

/**
 * Design Council 2026-11-24, surface 3 — Option A "One system": the
 * SINGLE landing header spec, shared verbatim by the home page and
 * /agences (which previously drifted into its own dialect). Lockup
 * left, primary nav, EN · FR · AR language marks, Log in, the orange
 * Sign up pill (navy text on orange — the AA pair fixed in Phase 1),
 * and one context action: "For Agencies" on home, "Home" on /agences.
 * Both pages sit the header on navy, so one dark-chrome rendering
 * serves both; `className` only carries positioning (absolute over
 * the home hero photo, in-flow inside the /agences navy hero).
 */
export default function SiteHeader({
  contextAction,
  anchorBase = '',
  className = '',
}: {
  /** Which context action to show: the agencies pill, or back Home. */
  contextAction: 'agencies' | 'home'
  /** '' on home (in-page anchors), '/' on /agences (anchors live on home). */
  anchorBase?: string
  className?: string
}) {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language
  const travelerUrl = process.env.NEXT_PUBLIC_TRAVELER_URL || 'http://localhost:3001'

  const langMarks = [
    { code: 'en', label: 'EN' },
    { code: 'fr', label: 'FR' },
    { code: 'ar', label: 'AR' },
  ]

  return (
    <header className={`text-white ${className}`}>
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Ouiboo">
          <LogoLockup height={30} tone="on-dark" />
        </Link>
        <nav className="hidden items-center gap-[34px] text-[15px] font-medium min-[901px]:flex" aria-label={t('common.globalNavigationLabel')}>
          <a href={`${anchorBase}#how`} className="opacity-90 hover:underline hover:underline-offset-[5px] hover:opacity-100">
            {t('nav.howItWorks')}
          </a>
          <a href={`${anchorBase}#guides`} className="opacity-90 hover:underline hover:underline-offset-[5px] hover:opacity-100">
            {t('hw.nav.guides')}
          </a>
          <a href={`${anchorBase}#faq`} className="opacity-90 hover:underline hover:underline-offset-[5px] hover:opacity-100">
            {t('hw.nav.faq')}
          </a>
        </nav>
        <div className="flex items-center gap-[18px]">
          <div className="hidden items-center gap-1.5 text-[13.5px] font-semibold tracking-wide sm:flex" role="group" aria-label="Language">
            {langMarks.map((mark, i) => (
              <span key={mark.code} className="flex items-center gap-1.5">
                {i > 0 && <span className="opacity-40">·</span>}
                <button
                  type="button"
                  onClick={() => i18n.changeLanguage(mark.code)}
                  aria-pressed={currentLang === mark.code}
                  className={currentLang === mark.code ? 'opacity-100 underline underline-offset-4' : 'opacity-55 hover:opacity-90'}
                >
                  {mark.label}
                </button>
              </span>
            ))}
          </div>
          <a
            href={`${travelerUrl}/login?lang=${currentLang}`}
            className="hidden text-[14.5px] font-semibold opacity-95 hover:underline hover:underline-offset-[5px] hover:opacity-100 sm:block"
          >
            {t('hw.nav.login')}
          </a>
          <a
            href={`${travelerUrl}/signup?lang=${currentLang}`}
            className="whitespace-nowrap rounded-full bg-sunset-orange px-[18px] py-[9px] text-sm font-semibold text-deep-blue shadow-[0_8px_20px_-8px_rgba(255,107,53,.6)] transition-colors"
          >
            {t('hw.nav.signup')}
          </a>
          {contextAction === 'agencies' ? (
            <Link
              href="/agences"
              className="hidden whitespace-nowrap rounded-full border-[1.5px] border-white/55 px-[18px] py-[9px] text-sm font-semibold hover:bg-white/[0.12] sm:block"
            >
              {t('nav.forAgencies')}
            </Link>
          ) : (
            <Link
              href="/"
              className="hidden whitespace-nowrap rounded-full border-[1.5px] border-white/55 px-[18px] py-[9px] text-sm font-semibold hover:bg-white/[0.12] sm:block"
            >
              {t('hw.agencesPage.nav.back')}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
