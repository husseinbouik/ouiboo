'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { BetaBadge, LogoLockup } from '@ouiboo/ui';
import { SUPPORT_EMAIL, supportMailto } from '@/lib/support';

/**
 * Session #3 P0-7b (#555): the traveller app had NO global footer —
 * layout rendered only Navbar + main, the home page hand-rolled a
 * two-item footer, and the support page was reachable only from a
 * booking's contacts card. This footer renders on every page: brand
 * lockup, the Support / Privacy / Terms routes, the configured support
 * address when one exists (P0-7a: no address renders when none is
 * configured — never a dead default), and the rights line.
 */
export function Footer() {
  const { t } = useTranslation();
  const mailto = supportMailto();

  return (
    <footer className="bg-background border-t border-border py-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            {/* #794: final lockup, matching the navbar. */}
            <LogoLockup height={30} tone="auto" />
            <BetaBadge />
          </div>

          <nav aria-label={t('footer.support')} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold text-muted-foreground">
            <Link href="/support" className="hover:text-foreground transition-colors">
              {t('footer.support')}
            </Link>
            <Link href="/help" className="hover:text-foreground transition-colors">
              {t('footer.help')}
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              {t('footer.privacy')}
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              {t('footer.terms')}
            </Link>
            {SUPPORT_EMAIL && mailto ? (
              <a href={mailto} className="hover:text-foreground transition-colors">
                {SUPPORT_EMAIL}
              </a>
            ) : null}
          </nav>

          <div className="text-sm text-muted-foreground">
            {t('footer.rights', { year: new Date().getFullYear() })}
          </div>
        </div>

        {/* Council #12 P1-11: the footer carries the plain explainer
            — what Ouiboo is, that bookings are requests, and that
            payment always goes to the agency directly (wording
            de-beta'd under the founder's #917 directive). */}
        <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-6 text-muted-foreground">
          {t('footer.explainer')}
        </p>
      </div>
    </footer>
  );
}
