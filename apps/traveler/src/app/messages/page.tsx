'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@ouiboo/ui';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/AuthContext';

type Conversation = {
  id: string;
  otherUser?: { name?: string; avatar?: string };
  lastMessage?: { content?: string; createdAt?: string };
  unreadCount?: number;
};

export default function MessagesPage() {
  const { t } = useTranslation();
  const { user, isLoading: isAuthLoading } = useAuth();

  const { data, isLoading } = useQuery<{ items: Conversation[] }>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await apiClient.get('/messages/conversations');
      return res.data;
    },
    enabled: Boolean(user),
  });

  const conversations = data?.items || [];

  // Show sign-in gate immediately for guests, don't wait for query (#139)
  if (!isAuthLoading && !user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-center py-28 bg-card/70 rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">{t('messages.signInTitle')}</h1>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
            {t('messages.signInBody')}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild>
              <Link href="/login">{t('messages.signIn')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/search">{t('messages.exploreTrips')}</Link>
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
          <div className="h-24 bg-muted rounded-2xl" />
          <div className="h-24 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Messages</h1>
      {conversations.length === 0 ? (
        <div className="text-center py-16 bg-card/70 rounded-2xl border border-dashed border-border">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('messages.emptyBody')}</p>
          <Button asChild variant="outline">
              <Link href="/search">{t('messages.browseTrips')}</Link>
            </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((c) => (
            <div key={c.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold">
                {(c.otherUser?.name || '?')[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{c.otherUser?.name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground truncate">{c.lastMessage?.content || 'No messages yet'}</p>
              </div>
              {(c.unreadCount || 0) > 0 && (
                <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full px-2 py-1">
                  {c.unreadCount}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
