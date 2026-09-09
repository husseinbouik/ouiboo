'use client';

import React, { useState } from 'react';
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
      setValidationError('Complete the dates, price, and seat count for every session.');
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[101] overflow-hidden border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-deep-blue dark:text-gray-100 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-sunset-orange" />
                  Bulk Session Creation
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create multiple sessions at once with date ranges and pricing</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Sessions List */}
              <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                {sessions.map((session, index) => (
                  <Card key={session.id} className="border-2 border-gray-100 dark:border-slate-800">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold text-deep-blue dark:text-gray-100">Session {index + 1}</h3>
                        {sessions.length > 1 && (
                          <button
                            onClick={() => removeSession(session.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
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
                              Start Date *
                            </Label>
                            <Input
                              id={`start-${session.id}`}
                              type="date"
                              value={session.startDate}
                              onChange={(e) => updateSession(session.id, 'startDate', e.target.value)}
                              className="h-10 dark:bg-slate-800 dark:border-slate-700"
                              disabled={isLoading}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`end-${session.id}`} className="text-sm font-medium">
                              End Date *
                            </Label>
                            <Input
                              id={`end-${session.id}`}
                              type="date"
                              value={session.endDate}
                              onChange={(e) => updateSession(session.id, 'endDate', e.target.value)}
                              className="h-10 dark:bg-slate-800 dark:border-slate-700"
                              disabled={isLoading}
                            />
                          </div>
                        </div>

                        {/* Pricing & Capacity */}
                        <div className="space-y-2">
                          <Label htmlFor={`price-${session.id}`} className="text-sm font-medium">
                            Price (per person) *
                          </Label>
                          <div className="relative">
                            <Input
                              id={`price-${session.id}`}
                              type="number"
                              value={session.price || ''}
                              onChange={(e) => updateSession(session.id, 'price', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="h-10 pr-12 dark:bg-slate-800 dark:border-slate-700"
                              disabled={isLoading}
                              step="0.01"
                              min="0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                              {currency}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`deposit-${session.id}`} className="text-sm font-medium">
                            Deposit (optional)
                          </Label>
                          <div className="relative">
                            <Input
                              id={`deposit-${session.id}`}
                              type="number"
                              value={session.deposit || ''}
                              onChange={(e) => updateSession(session.id, 'deposit', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="h-10 pr-12 dark:bg-slate-800 dark:border-slate-700"
                              disabled={isLoading}
                              step="0.01"
                              min="0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                              {currency}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`seats-${session.id}`} className="text-sm font-medium">
                            Total Seats *
                          </Label>
                          <Input
                            id={`seats-${session.id}`}
                            type="number"
                            value={session.totalSeats || ''}
                            onChange={(e) => updateSession(session.id, 'totalSeats', parseInt(e.target.value) || 0)}
                            placeholder="20"
                            className="h-10 dark:bg-slate-800 dark:border-slate-700"
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
                className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-slate-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Another Session
              </button>
            </div>

            {validationError ? (
              <p role="alert" className="mx-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">
                {validationError}
              </p>
            ) : null}

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 p-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-sunset-orange hover:bg-orange-600 px-6"
              >
                {isLoading ? 'Creating Sessions...' : `Create ${sessions.length} Session${sessions.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
