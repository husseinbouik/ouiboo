'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, MessageCircle, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';

/**
 * Design Council Phase 2 — Account cluster A (REDESIGN): one account
 * shell/header shared by profile, notifications and messages, ending
 * the three-different-headers problem. Each page keeps its own data
 * and body; only the chrome (title + section nav) is shared here.
 */
export function AccountShell({
  children,
  title,
}: {
  children: React.ReactNode;
  /** Page-specific heading rendered inside the shared shell. */
  title?: string;
}) {
  const { t } = useTranslation();
  const pathname = usePathname() || '';
  const links = [
    { href: '/profile', label: t('account.profile'), icon: User, active: pathname.startsWith('/profile') || pathname.startsWith('/settings') },
    { href: '/notifications', label: t('account.notifications'), icon: Bell, active: pathname.startsWith('/notifications') },
    { href: '/messages', label: t('account.messages'), icon: MessageCircle, active: pathname.startsWith('/messages') },
  ];
  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t('account.eyebrow')}</p>
      {title ? <h1 className="mt-1 text-3xl font-bold text-foreground font-display tracking-tight">{title}</h1> : null}
      <nav aria-label={t('account.navLabel')} className="mt-5 flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.active ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors',
              link.active
                ? 'border-deep-blue bg-deep-blue text-white dark:border-sunset-orange dark:bg-sunset-orange dark:text-deep-blue'
                : 'border-border bg-card text-foreground hover:bg-sand/60 dark:hover:bg-muted',
            )}
          >
            <link.icon className="h-4 w-4" aria-hidden="true" />
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
