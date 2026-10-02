'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Calendar } from 'lucide-react';
import { Button, Card, CardContent, Input, Label } from '@ouiboo/ui';

interface BulkSessionInput {
  id: string;
  startDate: string;
  endDate: string;
  price: number;
  deposit?: number;
  totalSeats: number;
  currency: string;
}

interface BulkSessionCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sessions: BulkSessionInput[]) => void;
  isLoading?: boolean;
  currency?: string;
}

export function BulkSessionCreationModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  currency = 'MAD'
}: BulkSessionCreationModalProps) {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<BulkSessionInput[]>([
    { id: '1', startDate: '', endDate: '', price: 0, deposit: 0, totalSeats: 20, currency }
  ]);
  const [validationError, setValidationError] = useState('');

  const addSession = () => {
    const newSession: BulkSessionInput = {
      id: Math.random().toString(36).substr(2, 9),
      startDate: '',
      endDate: '',
      price: 0,
      deposit: 0,
      totalSeats: 20,
      currency
    };
    setSessions([...sessions, newSession]);
  };

  const removeSession = (id: string) => {
    if (sessions.length > 1) {
      setSessions(sessions.filter(s => s.id !== id));
    }
  };

  const updateSession = (id: string, field: keyof BulkSessionInput, value: BulkSessionInput[keyof BulkSessionInput]) => {
    setValidationError('');
    setSessions(sessions.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSubmit = () => {
    // Validate sessions
    const isValid = sessions.every(s => s.startDate && s.endDate && s.price > 0 && s.totalSeats > 0);
    if (!isValid) {
      setValidationError(t('bulkSession.helper'));
      return;
    }
    onSubmit(sessions);
    setSessions([{ id: '1', startDate: '', endDate: '', price: 0, deposit: 0, totalSeats: 20, currency }]);
  };

  const handleClose = () => {
    setValidationError('');
    setSessions([{ id: '1', startDate: '', endDate: '', price: 0, deposit: 0, totalSeats: 20, currency }]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-session-title"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-card rounded-2xl shadow-2xl z-[101] overflow-hidden border border-border max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-card border-b border-border p-6 flex justify-between items-center gap-4">
              <div>
                <h2 id="bulk-session-title" className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-accent" />
                  {t('bulkSession.title')}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{t('bulkSession.subtitle')}</p>
              </div>
              <button
                onClick={handleClose}
                aria-label={t('common.close')}
                className="p-2 hover:bg-muted rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Sessions List */}
              <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                {sessions.map((session, index) => (
                  <Card key={session.id} className="border-2 border-border">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold text-foreground">{t('bulkSession.sessionN', { index: index + 1 })}</h3>
                        {sessions.length > 1 && (
                          <button
                            onClick={() => removeSession(session.id)}
                            aria-label={t('common.delete')}
                            className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Date Range */}
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`start-${session.id}`} className="text-sm font-medium">
                              {t('bulkSession.startDate')}
                            </Label>
                            <Input
                              id={`start-${session.id}`}
                              type="date"
                              value={session.startDate}
                              onChange={(e) => updateSession(session.id, 'startDate', e.target.value)}
                              className="h-10"
                              disabled={isLoading}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`end-${session.id}`} className="text-sm font-medium">
                              {t('bulkSession.endDate')}
                            </Label>
                            <Input
                              id={`end-${session.id}`}
                              type="date"
                              value={session.endDate}
                              onChange={(e) => updateSession(session.id, 'endDate', e.target.value)}
                              className="h-10"
                              disabled={isLoading}
                            />
                          </div>
                        </div>

                        {/* Pricing & Capacity */}
                        <div className="space-y-2">
                          <Label htmlFor={`price-${session.id}`} className="text-sm font-medium">
                            {t('bulkSession.pricePerPerson')}
                          </Label>
                          <div className="relative">
                            <Input
                              id={`price-${session.id}`}
                              type="number"
                              value={session.price || ''}
                              onChange={(e) => updateSession(session.id, 'price', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="h-10 pe-12"
                              disabled={isLoading}
                              step="0.01"
                              min="0"
                            />
                            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                              {currency}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`deposit-${session.id}`} className="text-sm font-medium">
                            {t('bulkSession.depositOptional')}
                          </Label>
                          <div className="relative">
                            <Input
                              id={`deposit-${session.id}`}
                              type="number"
                              value={session.deposit || ''}
                              onChange={(e) => updateSession(session.id, 'deposit', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="h-10 pe-12"
                              disabled={isLoading}
                              step="0.01"
                              min="0"
                            />
                            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                              {currency}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`seats-${session.id}`} className="text-sm font-medium">
                            {t('bulkSession.totalSeats')}
                          </Label>
                          <Input
                            id={`seats-${session.id}`}
                            type="number"
                            value={session.totalSeats || ''}
                            onChange={(e) => updateSession(session.id, 'totalSeats', parseInt(e.target.value) || 0)}
                            placeholder="20"
                            className="h-10"
                            disabled={isLoading}
                            min="1"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Add More Sessions Button */}
              <button
                onClick={addSession}
                disabled={isLoading}
                className="w-full p-3 border-2 border-dashed border-border text-muted-foreground rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Plus className="h-4 w-4" />
                {t('bulkSession.addAnother')}
              </button>
            </div>

            {validationError ? (
              <p role="alert" className="mx-6 rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                {validationError}
              </p>
            ) : null}

            {/* Footer */}
            <div className="sticky bottom-0 bg-card border-t border-border p-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                {t('bulkSession.cancel')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-accent text-accent-foreground hover:bg-accent/90 px-6"
              >
                {isLoading ? t('bulkSession.creating') : t('bulkSession.createCount', { count: sessions.length })}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
