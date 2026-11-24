'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LogoLockup } from '@ouiboo/ui';
import { SUPPORT_EMAIL, supportMailto } from '@/lib/support';
import { AGENCY_URL } from '@/lib/site';

/**
 * Session #3 P0-7b (#555): the traveller app had NO global footer —
 * layout rendered only Navbar + main, the home page hand-rolled a
 * two-item footer, and the support page was reachable only from a
 * booking's contacts card.
 *
 * Design Council 2026-11-24, surface 3 — Option A "One system": this
 * footer now follows the same spec as the landing app's rich navy
 * trust footer — brand lockup + the plain-language model explainer,
 * Explore / Trust / Agencies columns, and a legal-identity line.
 * Ouiboo has no registered legal entity yet, so the line carries the
 * project's public identity only (founder name + Tangier base, plus
 * the configured support address when one exists — P0-7a: no address
 * renders when none is configured, never a dead default).
 */
export function Footer() {
  const { t } = useTranslation();
  const mailto = supportMailto();
  const year = new Date().getFullYear();

  const colTitle = 'mb-4 font-display text-sm font-bold uppercase tracking-[0.1em] text-white';
  const list = 'flex flex-col gap-[11px] text-[14.5px]';
  const item = 'text-white/70 transition-colors hover:text-white';

  return (
    <footer className="bg-deep-blue pb-[34px] pt-16 text-white/80">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-2 gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-lg:col-span-2">
            {/* #794: final lockup, matching the navbar. */}
            <LogoLockup height={30} tone="on-dark" />
            {/* Council #12 P1-11: the footer carries the plain
                explainer — what Ouiboo is, that bookings are
                requests, and that payment always goes to the agency
                directly (wording de-beta'd under #917). */}
            <p className="mt-[14px] max-w-[320px] text-[14.5px] leading-[1.6] text-white/65">
              {t('footer.explainer')}
            </p>
          </div>

          <nav aria-label={t('footer.colExplore')}>
            <h4 className={colTitle}>{t('footer.colExplore')}</h4>
            <ul className={list}>
              <li>
                <Link href="/search" className={item}>
                  {t('footer.allTrips')}
                </Link>
              </li>
              <li>
                <Link href="/" className={item}>
                  {t('nav.featured')}
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className={item}>
                  {t('nav.wishlist')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t('footer.colTrust')}>
            <h4 className={colTitle}>{t('footer.colTrust')}</h4>
            <ul className={list}>
              <li>
                <Link href="/support" className={item}>
                  {t('footer.support')}
                </Link>
              </li>
              <li>
                <Link href="/help" className={item}>
                  {t('footer.help')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={item}>
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className={item}>
                  {t('footer.terms')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t('footer.colAgencies')}>
            <h4 className={colTitle}>{t('footer.colAgencies')}</h4>
            <ul className={list}>
              <li>
                <a href={AGENCY_URL} className={item}>
                  {t('footer.sellOnOuiboo')}
                </a>
              </li>
              <li>
                <a href={AGENCY_URL} className={item}>
                  {t('nav.agencyPanel')}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="border-t border-white/[0.12] pt-6 text-[13.5px] text-white/55">
          {t('footer.legalLine')}
          {SUPPORT_EMAIL && mailto ? (
            <>
              {' · '}
              <a href={mailto} className="transition-colors hover:text-white">
                {SUPPORT_EMAIL}
              </a>
            </>
          ) : null}
        </div>
        <div className="mt-4 text-[13.5px] text-white/55">{t('footer.rights', { year })}</div>
      </div>
    </footer>
  );
}
