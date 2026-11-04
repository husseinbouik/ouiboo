'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@ouiboo/ui';

type Conversation = {
  id: string;
  travelerId: string;
  traveler?: { id: string; name?: string | null } | null;
  messages?: Array<{ content?: string; createdAt?: string }>;
  unreadCount?: number;
};

/**
 * #729 (Council S7-2): the agency messages inbox. Conversations are
 * traveller-initiated (or booking/quote-linked) — this screen is the
 * reply side: list, open, answer. There is deliberately no "new
 * message" cold-start action here; the API enforces the same rule.
 */
export default function AgencyMessagesPage() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery<{ conversations: Conversation[] }>({
    queryKey: ['agency-conversations'],
    queryFn: async () => {
      const res = await apiClient.get('/messages/conversations');
      return res.data;
    },
  });

  const conversations = data?.conversations ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">{t('messages.title')}</h1>

      <div
        className="rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm flex gap-3"
        role="note"
      >
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium">{t('messages.idDocumentWarning')}</p>
          <p className="text-muted-foreground">{t('messages.replyHint')}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-muted rounded-2xl" />
          <div className="h-20 bg-muted rounded-2xl" />
        </div>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center space-y-3">
            <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto" aria-hidden="true" />
            <p className="font-semibold">{t('messages.emptyTitle')}</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('messages.emptyBody')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/messages/${c.id}`}
              className="block bg-card rounded-2xl border border-border p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold shrink-0"
                  aria-hidden="true"
                >
                  {(c.traveler?.name || '?')[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.traveler?.name || ''}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {c.messages?.[0]?.content || t('messages.noMessagesYet')}
                  </p>
                </div>
                {(c.unreadCount || 0) > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full px-2 py-1">
                    {c.unreadCount}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
