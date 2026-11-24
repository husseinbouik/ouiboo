'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { LogoLockup } from '@ouiboo/ui'
import { CookiePreferencesButton } from './AnalyticsConsent'

const NAVY = '#0A192F'

/**
 * Design Council 2026-11-24, surface 3 — Option A "One system": the
 * rich navy trust footer, shared verbatim by the home page and
 * /agences (which previously carried a slim footer that dropped the
 * Trust column). Brand + money-model tagline, Explore / Trust /
 * Agencies columns, then the legal-identity line.
 *
 * Legal identity: Ouiboo has NO registered legal entity yet (the API
 * invoice service reads OUIBOO_LEGAL_* from env precisely because
 * "the company is not registered yet"), so the line names the
 * project's public identity only — founder name, Tangier base and
 * the published support email — and invents no entity or address.
 */
export default function SiteFooter({
  anchorBase = '',
  className = '',
}: {
  /** '' on home (in-page anchors), '/' on /agences (anchors live on home). */
  anchorBase?: string
  className?: string
}) {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language
  const travelerUrl = process.env.NEXT_PUBLIC_TRAVELER_URL || 'http://localhost:3001'
  const agencyUrl = process.env.NEXT_PUBLIC_AGENCY_URL || 'http://localhost:3002'
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'ouibouuu@gmail.com'

  const colTitle = 'mb-4 font-display text-sm font-bold uppercase tracking-[0.1em] text-white'
  const list = 'flex flex-col gap-[11px] text-[14.5px]'

  return (
    <footer className={`pb-[34px] pt-16 text-white/[0.78] ${className}`} style={{ backgroundColor: NAVY }}>
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-12 grid grid-cols-2 gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 text-white" aria-label="Ouiboo">
              <LogoLockup height={30} tone="on-dark" />
            </Link>
            <p className="mt-[14px] max-w-[300px] text-[14.5px] leading-[1.6] text-white/[0.66]">{t('hw.footer.tagline')}</p>
          </div>
          <div>
            <h4 className={colTitle}>{t('hw.footer.colExplore')}</h4>
            <ul className={list}>
              <li>
                <a href={`${travelerUrl}/search?lang=${currentLang}`} className="hover:text-white">
                  {t('hw.footer.allTrips')}
                </a>
              </li>
              <li>
                <a href={`${travelerUrl}/?lang=${currentLang}`} className="hover:text-white">
                  {t('hw.footer.featuredTrips')}
                </a>
              </li>
              <li>
                <Link href="/guides" className="hover:text-white">
                  {t('hw.footer.guides')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={colTitle}>{t('hw.footer.colTrust')}</h4>
            <ul className={list}>
              <li>
                <Link href="/verification" className="hover:text-white">
                  {t('hw.footer.verification')}
                </Link>
              </li>
              <li>
                <a href={`${anchorBase}#how`} className="hover:text-white">
                  {t('hw.footer.payments')}
                </a>
              </li>
              <li>
                <a href={`${anchorBase}#faq`} className="hover:text-white">
                  {t('hw.footer.faq')}
                </a>
              </li>
              <li>
                <a href={`mailto:${supportEmail}`} className="hover:text-white">
                  {t('hw.footer.support')}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={colTitle}>{t('hw.footer.colAgencies')}</h4>
            <ul className={list}>
              <li>
                <Link href="/agences" className="hover:text-white">
                  {t('hw.footer.joinBeta')}
                </Link>
              </li>
              <li>
                <Link href="/agences" className="hover:text-white">
                  {t('hw.footer.foundingCohort')}
                </Link>
              </li>
              <li>
                <a href={`${agencyUrl}/login?lang=${currentLang}`} className="hover:text-white">
                  {t('hw.footer.agencyLogin')}
                </a>
              </li>
              <li>
                <a href={`${travelerUrl}/login?lang=${currentLang}`} className="hover:text-white">
                  {t('hw.footer.travellerLogin')}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.12] pt-6 text-[13.5px] text-white/[0.55]">
          {t('hw.footer.legalLine', { email: supportEmail })}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-[13.5px] text-white/[0.55]">
          <span>{t('hw.footer.bottomLeft', { year: new Date().getFullYear() })}</span>
          <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href="/privacy" className="hover:text-white">
              {t('footer.privacy')}
            </a>
            <a href={`${travelerUrl}/copyright-report?lang=${currentLang}`} className="hover:text-white">
              {t('hw.footer.copyright')}
            </a>
            <CookiePreferencesButton className="hover:text-white" />
            <span>{t('hw.footer.madeIn')}</span>
          </span>
        </div>
      </div>
    </footer>
  )
}
