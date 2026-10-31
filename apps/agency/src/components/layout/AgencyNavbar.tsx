'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { ThemeToggle, LanguageSwitcher } from '@ouiboo/ui';
import { useTranslation } from 'react-i18next';
import { AgencyCommandPalette } from '../AgencyCommandPalette';
import { UserMenu } from '../UserMenu';

export function AgencyNavbar() {
  const { t } = useTranslation();

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-8 sticky top-0 z-10 transition-colors duration-200">
      {/* #487: command-palette trigger (⌘K) in the previously empty
          start-side slot; the palette itself is mounted here too. */}
      <div className="flex-1">
        <AgencyCommandPalette />
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <ThemeToggle />

        <Link
          href="/dashboard/settings/notifications"
          className="p-2 text-muted-foreground hover:bg-muted rounded-lg relative transition-colors border border-transparent hover:border-border"
          title={t('navbar.notificationTitle')}
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 end-2 w-2 h-2 bg-accent rounded-full border-2 border-background" />
        </Link>

        <div className="h-8 w-px bg-border mx-2" />

        {/* #724: the account menu (UserMenu) was built but never mounted —
            the navbar showed a static, non-interactive user chip plus a
            separate logout icon instead, so the menu's entries were
            unreachable. Mount the real menu in their place; its Log out
            item calls the same logout. */}
        <UserMenu />
      </div>
    </header>
  );
}