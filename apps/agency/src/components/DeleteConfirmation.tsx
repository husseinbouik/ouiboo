'use client';

import React from 'react';
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
  title = "Delete Item", 
  description = "Are you sure you want to delete this item? This action cannot be undone.",
  isLoading = false
}: DeleteConfirmationProps) {
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl z-[101] overflow-hidden border border-gray-100 dark:border-slate-800"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              
              <div className="space-y-2 mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">{description}</p>
              </div>

              <div className="flex gap-3 mt-8">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1 h-12 rounded-xl dark:border-slate-700 dark:text-gray-300"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white border-none rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-900/20"
                >
                  {isLoading ? 'Deleting...' : 'Delete Permanently'}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
