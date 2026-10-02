'use client';

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar } from 'lucide-react';
import { Button, CardContent, Input, Label } from '@ouiboo/ui';
import { Card } from '@ouiboo/ui';
import { SessionStatus } from '@ouiboo/types';
import { formatCurrency, formatLocalDate } from '@ouiboo/utils';
import type { AgencyTripSession } from './session-types';

interface EditSessionModalProps {
  isOpen: boolean;
  session?: AgencyTripSession;
  onClose: () => void;
  onSubmit: (data: Partial<AgencyTripSession>) => void;
  isLoading?: boolean;
  isDelete?: boolean;
  onDelete?: () => void;
}

export function EditSessionModal({
  isOpen,
  session,
  onClose,
  onSubmit,
  isLoading = false,
  isDelete = false,
  onDelete
}: EditSessionModalProps) {
  const { t, i18n } = useTranslation();
  const sessionKey = useMemo(() => {
    if (!session) {
      return 'empty';
    }

    return [
      session.id,
      session.startDate,
      session.endDate,
      session.price,
      session.deposit,
      session.totalSeats,
      session.availableSeats,
      session.status,
      session.currency,
      session.cancellationReason ?? '',
    ].join('|');
  }, [session]);
  const [draftState, setDraftState] = useState<{ key: string; value: Partial<AgencyTripSession> }>({
    key: sessionKey,
    value: session || {},
  });
  const [validationError, setValidationError] = useState('');
  const formData = draftState.key === sessionKey ? draftState.value : (session || {});

  const updateFormData = (next: Partial<AgencyTripSession>) => {
    setValidationError('');
    setDraftState({ key: sessionKey, value: next });
  };

  const handleSubmit = () => {
    if (!formData.startDate || !formData.endDate || !formData.price) {
      setValidationError(t('editSession.validation'));
      return;
    }
    onSubmit(formData);
  };

  if (!session) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-session-title"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-2xl shadow-2xl z-[101] overflow-hidden border border-border"
          >
            <div className="flex justify-between items-center p-6 border-b border-border gap-4">
              <div>
                <h2 id="edit-session-title" className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-accent" />
                  {isDelete ? t('editSession.deleteTitle') : t('editSession.editTitle')}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {isDelete
                    ? t('editSession.cannotUndo')
                    : t('editSession.sessionDetails', { date: formatLocalDate(session.startDate, i18n.language) })}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label={t('common.close')}
                className="p-2 hover:bg-muted rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {isDelete ? (
              <div className="p-6 space-y-6">
                <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
                  <p className="text-sm text-danger">
                    {t('editSession.deleteBody')}
                  </p>
                </div>

                <Card className="border-2 border-warning/20 bg-warning/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">{t('editSession.dateRange')}</span>
                      <span className="font-semibold text-foreground">
                        {formatLocalDate(session.startDate, i18n.language)} - {formatLocalDate(session.endDate, i18n.language)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">{t('editSession.price')}</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(session.price, session.currency, i18n.language)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">{t('editSession.availableSeats')}</span>
                      <span className="font-semibold text-foreground">
                        {session.availableSeats} / {session.totalSeats}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onClose} disabled={isLoading}>
                    {t('editSession.cancel')}
                  </Button>
                  <Button
                    onClick={onDelete}
                    disabled={isLoading}
                    className="bg-danger text-danger-foreground hover:bg-danger/90"
                  >
                    {isLoading ? t('editSession.deleting') : t('editSession.deleteSession')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('editSession.startDate')}</Label>
                      <Input
                        type="date"
                        value={formData.startDate?.split('T')[0] || ''}
                        onChange={(e) => updateFormData({ ...formData, startDate: e.target.value })}
                        className="h-10"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('editSession.endDate')}</Label>
                      <Input
                        type="date"
                        value={formData.endDate?.split('T')[0] || ''}
                        onChange={(e) => updateFormData({ ...formData, endDate: e.target.value })}
                        className="h-10"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('editSession.pricePerPerson')}</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={formData.price || ''}
                          onChange={(e) => updateFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                          className="h-10 pe-12"
                          step="0.01"
                          min="0"
                          disabled={isLoading}
                        />
                        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                          {formData.currency}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('editSession.deposit')}</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={formData.deposit || ''}
                          onChange={(e) => updateFormData({ ...formData, deposit: parseFloat(e.target.value) || 0 })}
                          className="h-10 pe-12"
                          step="0.01"
                          min="0"
                          disabled={isLoading}
                        />
                        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                          {formData.currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('editSession.status')}</Label>
                    <select
                      value={formData.status || SessionStatus.Open}
                      onChange={(e) => updateFormData({ ...formData, status: e.target.value as AgencyTripSession['status'] })}
                      className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isLoading}
                    >
                      <option value={SessionStatus.Open}>{t('editSession.statusOpen')}</option>
                      <option value={SessionStatus.Full}>{t('editSession.statusFull')}</option>
                      <option value={SessionStatus.Cancelled}>{t('editSession.statusCancelled')}</option>
                    </select>
                  </div>

                  {formData.status === SessionStatus.Cancelled && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('editSession.cancellationReason')}</Label>
                      <Input
                        type="text"
                        value={formData.cancellationReason || ''}
                        onChange={(e) => updateFormData({ ...formData, cancellationReason: e.target.value })}
                        placeholder={t('editSession.cancellationPlaceholder')}
                        className="h-10"
                        disabled={isLoading}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('editSession.totalSeatsReadOnly')}</Label>
                    <Input
                      type="number"
                      value={formData.totalSeats || ''}
                      className="h-10 bg-muted"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('editSession.seatsNote')}
                    </p>
                  </div>
                </div>

                {validationError ? (
                  <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                    {validationError}
                  </p>
                ) : null}

                <div className="flex justify-end gap-3 border-t border-border pt-6">
                  <Button variant="outline" onClick={onClose} disabled={isLoading}>
                    {t('editSession.cancel')}
                  </Button>
                  <Button onClick={handleSubmit} disabled={isLoading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {isLoading ? t('editSession.saving') : t('editSession.saveChanges')}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
