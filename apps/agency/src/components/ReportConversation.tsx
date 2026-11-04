'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';

export const REPORT_REASONS = [
  { value: 'OFF_PLATFORM_PAYMENT', labelKey: 'messages.reportReasonOffPlatformPayment' },
  { value: 'ID_DOCUMENT_REQUEST', labelKey: 'messages.reportReasonIdDocumentRequest' },
  { value: 'HARASSMENT', labelKey: 'messages.reportReasonHarassment' },
  { value: 'SPAM', labelKey: 'messages.reportReasonSpam' },
  { value: 'OTHER', labelKey: 'messages.reportReasonOther' },
] as const;

/**
 * #729/#754: one-tap report on a conversation (agency side — the same
 * endpoint and category set as the traveller app). Message content is
 * never attached to the report.
 */
export default function ReportConversation({ conversationId }: { conversationId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>('OFF_PLATFORM_PAYMENT');
  const [details, setDetails] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/messages/conversations/${conversationId}/report`, {
        reason,
        details: details.trim() ? details.trim() : undefined,
      });
      return res.data;
    },
  });

  if (mutation.isSuccess) {
    return (
      <p className="text-sm font-medium text-success" role="status">
        {t('messages.reportDone')}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
        {t('messages.report')}
      </button>
    );
  }

  return (
    <form
      className="space-y-3 rounded-2xl border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <p className="font-semibold">{t('messages.reportTitle')}</p>
      <p className="text-sm text-muted-foreground">{t('messages.reportBody')}</p>
      <label className="block text-sm font-medium">
        {t('messages.reportReasonLabel')}
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
        >
          {REPORT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {t(r.labelKey)}
            </option>
          ))}
        </select>
      </label>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder={t('messages.reportDetailsPlaceholder')}
        maxLength={1000}
        rows={3}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
      />
      {mutation.isError && (
        <p className="text-sm font-medium text-danger" role="alert">
          {t('messages.sendFailed')}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {mutation.isPending ? t('messages.sending') : t('messages.reportSubmit')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
