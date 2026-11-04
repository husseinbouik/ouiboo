'use client';

import React from 'react';
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@ouiboo/ui';
import { User, LogOut, Settings, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { useTranslation } from 'react-i18next';

export function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await logout();
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 p-1.5 rounded-full hover:bg-muted transition-colors border outline-none">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar || ""} alt={user?.name || t('userMenu.account')} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start pe-2">
            <span className="text-sm font-bold leading-none">{user?.name || t('userMenu.account')}</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{user?.role === 'AGENCY' ? t('userMenu.owner') : t('userMenu.user')}</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name || t('userMenu.account')}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email || ''}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* #724: every entry must land on an implemented dashboard page.
            There is no /profile, /wallet or /settings route — the real
            equivalents are the dashboard settings pages (the settings
            page's own first tab is the profile form, and billing has its
            dedicated sub-page, matching the sidebar's label mapping). */}
        <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
          <User className="ms-2 h-4 w-4" />
          <span>{t('userMenu.profile')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/dashboard/settings/billing')}>
          <CreditCard className="ms-2 h-4 w-4" />
          <span>{t('userMenu.billing')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
          <Settings className="ms-2 h-4 w-4" />
          <span>{t('userMenu.settings')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-danger focus:text-danger">
          <LogOut className="ms-2 h-4 w-4" />
          <span>{t('userMenu.logOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}