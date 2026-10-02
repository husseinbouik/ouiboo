'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@ouiboo/ui';

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
}

export function DeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isLoading = false
}: DeleteConfirmationProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('deleteConfirmation.defaultTitle');
  const resolvedDescription = description ?? t('deleteConfirmation.defaultDescription');

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
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-confirmation-title"
            aria-describedby="delete-confirmation-description"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-[2rem] shadow-2xl z-[101] overflow-hidden border border-border"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center text-danger">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <button onClick={onClose} aria-label={t('common.close')} className="p-2 hover:bg-muted rounded-xl transition-colors">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-2 mb-8">
                <h3 id="delete-confirmation-title" className="text-2xl font-bold text-foreground">{resolvedTitle}</h3>
                <p id="delete-confirmation-description" className="text-muted-foreground leading-relaxed font-medium">{resolvedDescription}</p>
              </div>

              <div className="flex gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-12 rounded-xl"
                >
                  {t('deleteConfirmation.cancel')}
                </Button>
                <Button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 h-12 bg-danger text-danger-foreground hover:bg-danger/90 border-none rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-danger/20"
                >
                  {isLoading ? t('deleteConfirmation.deleting') : t('deleteConfirmation.deletePermanently')}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
