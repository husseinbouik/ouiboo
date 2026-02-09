'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar } from 'lucide-react';
import { Button, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@ouiboo/ui';
import { Card } from '@ouiboo/ui';

interface Session {
  id: string;
  startDate: string;
  endDate: string;
  price: number;
  deposit: number;
  totalSeats: number;
  availableSeats: number;
  status: 'OPEN' | 'FULL' | 'CANCELLED';
  currency: string;
  cancellationReason?: string | null;
}

interface EditSessionModalProps {
  isOpen: boolean;
  session?: Session;
  onClose: () => void;
  onSubmit: (data: Partial<Session>) => void;
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
  const [formData, setFormData] = useState<Partial<Session>>(session || {});

  useEffect(() => {
    if (session) {
      setFormData(session);
    }
  }, [session]);

  const handleSubmit = () => {
    if (!formData.startDate || !formData.endDate || !formData.price) {
      alert('Please fill in all required fields');
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[101] overflow-hidden border border-gray-100 dark:border-slate-800"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-deep-blue dark:text-gray-100 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-sunset-orange" />
                  {isDelete ? 'Delete Session' : 'Edit Session'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {isDelete
                    ? 'This action cannot be undone'
                    : `Update session details for ${new Date(session.startDate).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {isDelete ? (
              <div className="p-6 space-y-6">
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    You are about to delete this session. If there are any bookings associated with this session, they will need to be cancelled first.
                  </p>
                </div>

                <Card className="border-2 border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Date Range:</span>
                      <span className="font-semibold text-deep-blue dark:text-gray-100">
                        {new Date(session.startDate).toLocaleDateString()} - {new Date(session.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Price:</span>
                      <span className="font-semibold text-deep-blue dark:text-gray-100">
                        {session.price} {session.currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Available Seats:</span>
                      <span className="font-semibold text-deep-blue dark:text-gray-100">
                        {session.availableSeats} / {session.totalSeats}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button
                    onClick={onDelete}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isLoading ? 'Deleting...' : 'Delete Session'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Start Date</Label>
                      <Input
                        type="date"
                        value={formData.startDate?.split('T')[0] || ''}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="h-10 dark:bg-slate-800 dark:border-slate-700"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">End Date</Label>
                      <Input
                        type="date"
                        value={formData.endDate?.split('T')[0] || ''}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="h-10 dark:bg-slate-800 dark:border-slate-700"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Price per Person</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={formData.price || ''}
                          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                          className="h-10 pr-12 dark:bg-slate-800 dark:border-slate-700"
                          step="0.01"
                          min="0"
                          disabled={isLoading}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                          {formData.currency}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Deposit</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={formData.deposit || ''}
                          onChange={(e) => setFormData({ ...formData, deposit: parseFloat(e.target.value) || 0 })}
                          className="h-10 pr-12 dark:bg-slate-800 dark:border-slate-700"
                          step="0.01"
                          min="0"
                          disabled={isLoading}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                          {formData.currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <select 
                      value={formData.status || 'OPEN'} 
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300"
                      disabled={isLoading}
                    >
                      <option value="OPEN">Open for Bookings</option>
                      <option value="FULL">Full</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  {formData.status === 'CANCELLED' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Cancellation Reason</Label>
                      <Input
                        type="text"
                        value={formData.cancellationReason || ''}
                        onChange={(e) => setFormData({ ...formData, cancellationReason: e.target.value })}
                        placeholder="e.g., Insufficient bookings, Emergency closure..."
                        className="h-10 dark:bg-slate-800 dark:border-slate-700"
                        disabled={isLoading}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Total Seats (Read-only)</Label>
                    <Input
                      type="number"
                      value={formData.totalSeats || ''}
                      className="h-10 dark:bg-slate-800 dark:border-slate-700 bg-gray-50 dark:bg-slate-800"
                      disabled
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Note: Total seats cannot be changed after creation. To modify capacity, delete and recreate the session.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800 pt-6">
                  <Button variant="outline" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={isLoading} className="bg-sunset-orange hover:bg-orange-600">
                    {isLoading ? 'Saving...' : 'Save Changes'}
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
