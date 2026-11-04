'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, MessageCircle, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { Button } from '@ouiboo/ui';
import { useAuth } from '@/components/AuthContext';

type ConversationSummary = {
  id: string;
  agencyId: string;
};

/**
 * #729 (Council S7-2): the traveller start door. If the pair already
 * has a conversation, this screen is a pass-through to it; otherwise
 * the first message creates the pair conversation (traveller-initiated
 * only — the API refuses agency cold-starts and blocked pairs).
 */
function StartConversation() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const agencyId = searchParams.get('agencyId') || '';
  const agencyName = searchParams.get('agencyName') || '';
  const { user, isLoading: isAuthLoading } = useAuth();
  const [draft, setDraft] = useState('');
  const [showNudge, setShowNudge] = useState(false);
  const [sendError, setSendError] = useState(false);

  const { data, isLoading } = useQuery<{ conversations: ConversationSummary[] }>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await apiClient.get('/messages/conversations', { params: { limit: 50 } });
      return res.data;
    },
    enabled: Boolean(user && agencyId),
  });

  const existing = data?.conversations?.find((c) => c.agencyId === agencyId);

  React.useEffect(() => {
    if (existing) {
      router.replace(`/messages/${existing.id}`);
    }
  }, [existing, router]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiClient.post('/messages', { recipientId: agencyId, content });
      return res.data;
    },
    onSuccess: (result) => {
      if (result?.contactExchange?.detected) {
        setShowNudge(true);
      }
      const conversationId = result?.conversationId || result?.conversation?.id;
      if (conversationId) {
        router.replace(`/messages/${conversationId}`);
      }
    },
    onError: () => setSendError(true),
  });

  if (!isAuthLoading && !user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="text-center py-20 bg-card/70 rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">{t('messages.signInTitle')}</h1>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">{t('messages.signInBody')}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild>
              <Link
                href={`/login?redirect=${encodeURIComponent(
                  `/messages/start?agencyId=${agencyId}&agencyName=${encodeURIComponent(agencyName)}`,
                )}`}
              >
                {t('messages.signIn')}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthLoading || isLoading || existing) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-24 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold">{t('messages.startTitle', { agency: agencyName })}</h1>
      <p className="mt-2 text-muted-foreground">{t('messages.startBody')}</p>

      {/* #629: no ID documents via messages — standing composer notice. */}
      <div
        className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm flex gap-3"
        role="note"
      >
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <p className="font-medium text-foreground">{t('messages.idDocumentWarning')}</p>
      </div>

      <form
        className="mt-6 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const content = draft.trim();
          if (content) sendMutation.mutate(content);
        }}
      >
        <label className="sr-only" htmlFor="start-composer">
          {t('messages.composerPlaceholder')}
        </label>
        <textarea
          id="start-composer"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('messages.composerPlaceholder')}
          maxLength={2000}
          rows={3}
          className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm"
        />
        <button
          type="submit"
          disabled={sendMutation.isPending || !draft.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {sendMutation.isPending ? t('messages.sending') : t('messages.send')}
        </button>
      </form>

      {sendError && (
        <p className="mt-3 text-sm font-medium text-danger" role="alert">
          {t('messages.sendFailed')}
        </p>
      )}
      {showNudge && (
        <div className="mt-4 rounded-2xl border border-ocean-500/30 bg-ocean-500/10 p-4 text-sm" role="status">
          <p className="font-medium text-foreground">{t('messages.keepOnOuibooWarning')}</p>
        </div>
      )}
    </div>
  );
}

export default function StartConversationPage() {
  return (
    <Suspense fallback={null}>
      <StartConversation />
    </Suspense>
  );
}
