'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { FileCheck2, Loader2 } from 'lucide-react';
import { Button, Input, Label, Textarea } from '@ouiboo/ui';
import { apiClient } from '@/lib/api-client';
import { PrivateDocumentUpload } from './PrivateDocumentUpload';

type SubmitErrorLike = {
  response?: { data?: { message?: string | string[] } };
  message?: string;
};

export interface RefundEvidencePayload {
  reference: string;
  proofUrl: string;
  amount?: number;
  note?: string;
}

/**
 * #416 (Council P0-09): one evidence shape for every agency submission
 * (decision D9) — the bank/provider reference AND the retained
 * confirmation document are both mandatory; a reference without the
 * document is an assertion, not evidence. The API records the
 * submission as tier BANK_REFERENCE, upgraded to
 * BANK_PROVIDER_CONFIRMATION when the reference matches the provider
 * transaction id already held for the booking. Submitting evidence
 * never completes the case by itself: completion runs through the
 * evidence gate in RefundsService.
 */
export function isRefundEvidenceReady(reference: string, proofKey: string | null): boolean {
  return reference.trim().length > 0 && !!proofKey;
}

interface RefundEvidenceFormProps {
  caseId: string;
  /** Case amount (approved ?? requested), used as the amount placeholder. */
  expectedAmount?: string;
  currency?: string;
  onSubmitted?: () => void;
}

export function RefundEvidenceForm({
  caseId,
  expectedAmount,
  currency,
  onSubmitted,
}: RefundEvidenceFormProps) {
  const { t } = useTranslation();
  const [reference, setReference] = useState('');
  const [proofKey, setProofKey] = useState<string | null>(null);
  const [proofName, setProofName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = isRefundEvidenceReady(reference, proofKey);

  const submitMutation = useMutation({
    mutationFn: async (payload: RefundEvidencePayload) => {
      await apiClient.post(`/agency/refunds/${caseId}/evidence`, payload);
    },
    onSuccess: () => {
      setReference('');
      setProofKey(null);
      setProofName('');
      setAmount('');
      setNote('');
      setError(null);
      setFeedback(t('refunds.evidence.submitted'));
      onSubmitted?.();
    },
    onError: (err: SubmitErrorLike) => {
      const message = err.response?.data?.message || err.message || '';
      setFeedback(null);
      setError(
        t('refunds.evidence.submitFailed', {
          message: Array.isArray(message) ? message.join(', ') : message,
        }),
      );
    },
  });

  const handleSubmit = () => {
    if (!ready || !proofKey) return;
    const payload: RefundEvidencePayload = {
      reference: reference.trim(),
      proofUrl: proofKey,
    };
    const parsedAmount = Number(amount);
    if (amount.trim() && Number.isFinite(parsedAmount) && parsedAmount > 0) {
      payload.amount = parsedAmount;
    }
    if (note.trim()) {
      payload.note = note.trim();
    }
    submitMutation.mutate(payload);
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-background/60 px-4 py-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <FileCheck2 className="h-4 w-4 text-accent" />
        {t('refunds.evidence.title')}
      </h3>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('refunds.evidence.instruction')}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`refund-evidence-reference-${caseId}`}>
            {t('refunds.evidence.referenceLabel')}
          </Label>
          <Input
            id={`refund-evidence-reference-${caseId}`}
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={t('refunds.evidence.referencePlaceholder')}
            disabled={submitMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            {t('refunds.evidence.referenceHint')}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`refund-evidence-amount-${caseId}`}>
            {t('refunds.evidence.amountLabel')}
            {currency ? ` (${currency})` : ''}
          </Label>
          <Input
            id={`refund-evidence-amount-${caseId}`}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={expectedAmount ?? ''}
            disabled={submitMutation.isPending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('refunds.evidence.proofLabel')}</Label>
        <PrivateDocumentUpload
          hasDocument={!!proofKey}
          documentName={proofName}
          disabled={submitMutation.isPending}
          onUploaded={(key, name) => {
            setProofKey(key);
            setProofName(name);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`refund-evidence-note-${caseId}`}>
          {t('refunds.evidence.noteLabel')}
        </Label>
        <Textarea
          id={`refund-evidence-note-${caseId}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('refunds.evidence.notePlaceholder')}
          disabled={submitMutation.isPending}
          rows={2}
        />
      </div>

      {feedback && <p className="text-xs font-semibold text-success">{feedback}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}

      <Button
        size="sm"
        disabled={!ready || submitMutation.isPending}
        onClick={handleSubmit}
      >
        {submitMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          t('refunds.evidence.submit')
        )}
      </Button>
    </div>
  );
}
