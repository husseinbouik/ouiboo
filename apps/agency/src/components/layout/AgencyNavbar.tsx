'use client';

import Link from 'next/link';
import { Bell, LogOut } from 'lucide-react';
import { ThemeToggle, LanguageSwitcher } from '@ouiboo/ui';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';

export function AgencyNavbar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const initials = user?.name
    ? user.name.split(' ').map((part) => part[0]).join('').toUpperCase()
    : '??';

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-8 sticky top-0 z-10 transition-colors duration-200">
      <div className="flex-1" />

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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 p-1 pe-3 hover:bg-muted rounded-lg transition-colors group">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/10">
              {initials}
            </div>
            <div className="text-start hidden lg:block">
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {user?.name || t('navbar.loadingUser')}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                {user?.agencyProfile?.companyName || t('navbar.profilePending')}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
            title={t('navbar.logoutTitle')}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}