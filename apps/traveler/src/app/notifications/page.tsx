'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@ouiboo/ui';
import { Bell } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';

type Notification = {
  id: string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
};

export default function NotificationsPage() {
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

  // Show sign-in gate immediately for guests (#139)
  if (!isAuthLoading && !user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-center py-28 bg-card/70 rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">Sign in to view your notifications</h1>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
            Stay updated on booking confirmations, trip updates, and messages.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/search">Explore Trips</Link>
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
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Notifications</h1>
      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-card/70 rounded-2xl border border-dashed border-border">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">You&apos;re all caught up. No new notifications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-card rounded-2xl border p-4 ${n.read ? 'border-border' : 'border-primary/40 bg-primary/5'}`}
            >
              <p className="font-semibold">{n.title || 'Notification'}</p>
              {n.message && <p className="text-sm text-muted-foreground mt-1">{n.message}</p>}
              {n.createdAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(n.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
