'use client';

import React from 'react';
import Image from 'next/image';
import { Search, LogOut } from 'lucide-react';
import { Card, CardContent, ThemeToggle, LanguageSwitcher, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, BetaBadge, Logo, CommandPalette, type CommandPaletteItem } from '@ouiboo/ui';
import type { AdminTab } from './types';
import FlagDiagnostics from './FlagDiagnostics';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type NavItem = {
  key: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Optional: tabs without a countable queue (e.g. Security, #418) omit the badge. */
  count?: number;
};

type SummaryCard = {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  /** #559: cards with a deep link (e.g. refund urgency) render as buttons. */
  onClick?: () => void;
};

type DashboardShellProps = {
  t: TFn;
  activeTab: AdminTab;
  navItems: NavItem[];
  onTabChange: (tab: AdminTab) => void;
  currentTab: { title: string; description: string; searchPlaceholder: string };
  searchQuery: string;
  onSearchChange: (value: string) => void;
  summaryCards: SummaryCard[];
  /** #487: extra palette items (agencies / trips / bookings by name),
   * built by the host page from data it already holds. Selecting one
   * navigates only (tab switch + search), never mutates. */
  paletteItems?: CommandPaletteItem[];
  onLogout: () => Promise<void>;
  children: React.ReactNode;
};

export default function DashboardShell({
  t,
  activeTab,
  navItems,
  onTabChange,
  currentTab,
  searchQuery,
  onSearchChange,
  summaryCards,
  paletteItems = [],
  onLogout,
  children,
}: DashboardShellProps) {
  return (
<div className="min-h-screen bg-background flex">
  {/* Sidebar - desktop only */}
  <aside className="hidden md:flex w-64 bg-deep-blue text-white p-6 space-y-8 flex-col">
     <div className="flex items-center gap-3 px-2">
        {/* Session #3 P0-4 (#552): the admin shell previously showed an
            empty orange square here — it gets the shared pin Logo like
            every other app. */}
        <Logo size={32} />
        <span className="text-xl font-black tracking-tight">{t('dashboard.brand')}</span>
        <BetaBadge />
     </div>
     
     <nav aria-label={t('dashboard.aria.mainNavigation')} className="space-y-2 flex-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-bold text-sm text-start">{item.label}</span>
              {typeof item.count === 'number' && (
                <span className={`ms-auto text-[10px] font-black px-2 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-white/10 text-white/70"}`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
     </nav>

     {/* #580: build-stamped flag readout — ends "broken or gated?" reports. */}
     <FlagDiagnostics t={t} />
  </aside>

  {/* Main Content */}
  <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 p-4 md:p-10 space-y-6 md:space-y-10">
     {/* Mobile nav - horizontal scrollable tabs */}
     <nav aria-label={t('dashboard.aria.mainNavigation')} className="md:hidden flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap text-xs font-bold transition-all ${isActive ? "bg-deep-blue text-white shadow-sm" : "bg-card text-muted-foreground border border-border"}`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
     </nav>

     <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
           <h1 className="oui-balance text-2xl md:text-3xl font-black text-foreground">{currentTab.title}</h1>
           <p className="text-muted-foreground font-medium text-sm md:text-base">{currentTab.description}</p>
        </div>
        <div className="flex items-center gap-3">
           <CommandPalette
              items={[
                ...navItems.map((item) => ({
                  id: `tab-${item.key}`,
                  label: item.label,
                  group: t('commandPalette.groupNavigation'),
                  perform: () => onTabChange(item.key),
                })),
                ...paletteItems,
              ]}
              placeholder={t('commandPalette.placeholder')}
              emptyText={t('commandPalette.empty')}
              ariaLabel={t('commandPalette.open')}
              triggerLabel={t('commandPalette.trigger')}
              withTrigger
           />
           <div className="hidden sm:block relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={currentTab.searchPlaceholder}
                className="ps-10 pe-4 py-2 bg-card rounded-xl border-none shadow-sm text-sm focus:ring-2 focus:ring-sunset-orange/20"
              />
           </div>
           <LanguageSwitcher />
           <ThemeToggle />
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <button
                 aria-label={t('dashboard.signOut')}
                 className="h-10 w-10 bg-muted rounded-full border-2 border-border shadow-sm overflow-hidden hover:border-sunset-orange transition-colors focus:outline-none focus:ring-2 focus:ring-sunset-orange/40"
               >
                 <Image src="https://ui-avatars.com/api/?name=Admin&background=0A192F&color=fff" alt={t('dashboard.aria.adminAvatar')} width={40} height={40} />
               </button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end">
               <DropdownMenuItem
                 onSelect={async (event) => {
                   event.preventDefault();
                   // #641: logout() now fully tears the session down
                   // (cache + BFF cookie) and navigates to /login
                   // itself. The hard window.location redirect that
                   // used to follow raced that teardown and bounced
                   // back to the dashboard, so sign-out took two
                   // clicks.
                   await onLogout();
                 }}
                 className="text-danger focus:text-danger cursor-pointer"
               >
                 <LogOut className="h-4 w-4 me-2" />
                 {t('dashboard.signOut')}
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
        </div>
     </header>

     <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const inner = (
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{card.label}</p>
                <p className="oui-numeric text-3xl font-black text-foreground mt-2">{card.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${card.tone}`}>
                <card.icon className="h-6 w-6" />
              </div>
            </CardContent>
          );
          return card.onClick ? (
            <button
              key={card.label}
              type="button"
              onClick={card.onClick}
              aria-label={card.label}
              className="text-start rounded-2xl focus:outline-none focus:ring-2 focus:ring-sunset-orange/40"
            >
              <Card className="border-none shadow-sm rounded-2xl hover:shadow transition-shadow">{inner}</Card>
            </button>
          ) : (
            <Card key={card.label} className="border-none shadow-sm rounded-2xl">
              {inner}
            </Card>
          );
        })}
     </section>

         {/* Content Area */}
         <div className="space-y-6">
            {children}
         </div>
      </main>
    </div>
  );
}
