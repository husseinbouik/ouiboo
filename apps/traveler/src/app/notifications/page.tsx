'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button, EmptyState } from '@ouiboo/ui';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/AuthContext';
import { PushNotificationToggle } from '@/components/PushNotificationToggle';
import { AccountShell } from '@/components/AccountShell';

type Notification = {
  id: string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { user, isLoading: isAuthLoading } = useAuth();

  const { data, isLoading } = useQuery<{ items: Notification[] }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications');
      return res.data;
    },
    enabled: Boolean(user),
  });

  const notifications = data?.items || [];
  // Phase 2 — Account A: grouped notifications + mark-all-read. The
  // notifications API exposes no read-state mutation (NotificationLog
  // rows are read:false by contract), so mark-all-read is a local
  // reading state for this session only — it never claims the server
  // recorded it.
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(new Set());
  const [allRead, setAllRead] = useState(false);
  const isRead = (n: Notification) => allRead || readIds.has(n.id) || Boolean(n.read);
  const groups = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const today: Notification[] = []; const earlier: Notification[] = [];
    for (const n of notifications) {
      if (n.createdAt && new Date(n.createdAt) >= todayStart) today.push(n); else earlier.push(n);
    }
    return [
      { key: 'today', label: t('notifications.groupToday'), items: today },
      { key: 'earlier', label: t('notifications.groupEarlier'), items: earlier },
    ].filter((g) => g.items.length > 0);
  }, [notifications, t]);

  // Show sign-in gate immediately for guests (#139)
  if (!isAuthLoading && !user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-center py-28 bg-card/70 rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">{t('notifications.signInTitle')}</h1>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
            Stay updated on booking confirmations, trip updates, and messages.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild>
              <Link href="/login">{t('notifications.signIn')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/search">{t('notifications.exploreTrips')}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthLoading || isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-20 bg-muted rounded-2xl" />
          <div className="h-20 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <AccountShell title={t('notifications.title')}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <PushNotificationToggle />
          {notifications.some((n) => !isRead(n)) ? (
            <Button type="button" variant="outline" onClick={() => setAllRead(true)}>
              {t('notifications.markAllRead')}
            </Button>
          ) : null}
        </div>
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title={t('notifications.emptyTitle')}
            description={t('notifications.emptyBody')}
          />
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">{group.label}</h2>
                <div className="space-y-3">
                  {group.items.map((n) => (
                    <button
                      type="button"
                      key={n.id}
                      onClick={() => setReadIds((prev) => new Set(prev).add(n.id))}
                      className={`block w-full rounded-2xl border bg-card p-4 text-start ${isRead(n) ? 'border-border' : 'border-primary/40 bg-primary/5'}`}
                    >
                      <p className="font-semibold">{n.title || t('notifications.fallbackTitle')}</p>
                      {n.message && <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>}
                      {n.createdAt && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </AccountShell>
    </div>
  );
}
