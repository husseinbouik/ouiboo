'use client';

import React, { useState } from 'react';
import { XCircle } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@ouiboo/ui';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type AdminActionModalProps = {
  t: TFn;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  children?: React.ReactNode;
};

/**
 * #423: shared confirmation modal for admin stuck-state interventions.
 * Every intervention requires a written reason (minimum 3 characters);
 * the reason is stored in the AuditLog entry the API writes in the same
 * transaction as the state change. Action-specific inputs (a new
 * deadline, a corrected amount, …) are passed as children; the API
 * re-validates everything server-side.
 */
export default function AdminActionModal({
  t,
  title,
  description,
  confirmLabel,
  destructive,
  pending,
  error,
  onClose,
  onSubmit,
  children,
}: AdminActionModalProps) {
  const [reason, setReason] = useState('');
  const reasonValid = reason.trim().length >= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <Card className="max-w-lg w-full border-none shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-foreground">{title}</CardTitle>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <Button variant="ghost" onClick={onClose} aria-label={t('dashboard.interventions.cancel')}>
            <XCircle className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
          <div className="space-y-2">
            <label
              htmlFor="admin-action-reason"
              className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t('dashboard.interventions.reasonLabel')}
            </label>
            <textarea
              id="admin-action-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('dashboard.interventions.reasonPlaceholder')}
              rows={3}
              className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-orange/20"
            />
            <p className="text-xs text-muted-foreground">{t('dashboard.interventions.auditNote')}</p>
          </div>
          {error && <div className="text-sm font-medium text-danger">{error}</div>}
          <div className="flex flex-wrap gap-3">
            <Button
              className={destructive
                ? 'bg-danger text-white hover:bg-danger/90 border-none'
                : 'bg-deep-blue hover:bg-deep-blue/90 text-white border-none'}
              disabled={!reasonValid || pending}
              onClick={() => onSubmit(reason.trim())}
            >
              {confirmLabel}
            </Button>
            <Button variant="outline" className="border-border" onClick={onClose} disabled={pending}>
              {t('dashboard.interventions.cancel')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
