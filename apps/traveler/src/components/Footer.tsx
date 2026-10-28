'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { BetaBadge, Logo } from '@ouiboo/ui';
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
      <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          {/* #552 round 3: footer lockup matches the navbar at 40px —
              at 32px the pin read as a dot here too (witnessed). */}
          <Logo size={40} />
          <span className="font-bold text-xl text-deep-blue dark:text-foreground">Ouiboo</span>
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
    </footer>
  );
}
