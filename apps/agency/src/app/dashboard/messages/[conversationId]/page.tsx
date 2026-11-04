'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/AuthContext';
import ReportConversation from '@/components/ReportConversation';

type ThreadMessage = {
  id: string;
  senderId: string;
  content: string;
  attachmentUrl?: string | null;
  createdAt: string;
};

type ThreadResponse = {
  messages: ThreadMessage[];
  conversation: {
    id: string;
    travelerId: string;
    travelerName?: string | null;
    agencyId: string;
    agencyName?: string | null;
    agencyBlocked: boolean;
  };
};

/**
 * #729 (Council S7-2): the agency conversation view — read the thread
 * and reply in place (recipient = the conversation's traveller; the
 * API re-checks the relationship on every send). The composer carries
 * the no-ID-documents notice (#629), and a flagged contact-exchange
 * send shows the sender-only gentle notice — the agency's own sends
 * are detected exactly like the traveller's, and delivered unchanged.
 */
export default function AgencyConversationPage() {
  const { t } = useTranslation();
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [showNudge, setShowNudge] = useState(false);
  const [sendError, setSendError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<ThreadResponse>({
    queryKey: ['agency-conversation', conversationId],
    queryFn: async () => {
      const res = await apiClient.get(`/messages/conversations/${conversationId}`);
      return res.data;
    },
    enabled: Boolean(conversationId),
    refetchInterval: 20_000,
  });

  const conversation = data?.conversation;
  const messages = data?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiClient.post('/messages', {
        recipientId: conversation?.travelerId,
        content,
      });
      return res.data;
    },
    onSuccess: (result) => {
      setDraft('');
      setSendError(false);
      setShowNudge(Boolean(result?.contactExchange?.detected));
      queryClient.invalidateQueries({ queryKey: ['agency-conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['agency-conversations'] });
    },
    onError: () => setSendError(true),
  });

  if (isLoading || !conversation) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-24 bg-muted rounded-2xl" />
        <div className="h-24 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/messages"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('messages.backToMessages')}
      </Link>

      <h1 className="text-2xl font-black">
        {t('messages.conversationWith', { name: conversation.travelerName || '' })}
      </h1>

      {/* #629: no ID documents via messages — standing composer notice. */}
      <div
        className="rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm flex gap-3"
        role="note"
      >
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <p className="font-medium">{t('messages.idDocumentWarning')}</p>
      </div>

      {conversation.agencyBlocked && (
        <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm" role="note">
          <p className="font-medium">{t('messages.blockedByTravelerNotice')}</p>
        </div>
      )}

      <div className="space-y-3" aria-live="polite">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">{t('messages.emptyThread')}</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    mine
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-card border border-border rounded-bl-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  {m.attachmentUrl && (
                    <a
                      href={m.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block underline break-all"
                    >
                      {m.attachmentUrl}
                    </a>
                  )}
                  <p className={`mt-1 text-[11px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const content = draft.trim();
          if (content) sendMutation.mutate(content);
        }}
      >
        <label className="sr-only" htmlFor="agency-message-composer">
          {t('messages.composerPlaceholder')}
        </label>
        <textarea
          id="agency-message-composer"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('messages.composerPlaceholder')}
          maxLength={2000}
          rows={2}
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
        <p className="text-sm font-medium text-danger" role="alert">
          {t('messages.sendFailed')}
        </p>
      )}

      {/* Council S7: sender-only detection nudge (delivered unchanged). */}
      {showNudge && (
        <div className="rounded-2xl border border-ocean-500/30 bg-ocean-500/10 p-4 text-sm" role="status">
          <p className="font-medium">{t('messages.keepOnOuibooWarning')}</p>
        </div>
      )}

      <div className="border-t border-border pt-6">
        <ReportConversation conversationId={conversationId} />
      </div>
    </div>
  );
}
