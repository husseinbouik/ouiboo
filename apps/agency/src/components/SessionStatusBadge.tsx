'use client';

import React from 'react';
import { Badge } from '@ouiboo/ui';
import { AlertCircle, Check, Lock } from 'lucide-react';

interface SessionStatusBadgeProps {
  status: 'OPEN' | 'FULL' | 'CANCELLED';
  size?: 'sm' | 'md' | 'lg';
}

export function SessionStatusBadge({ status, size = 'md' }: SessionStatusBadgeProps) {
  const statusConfig = {
    OPEN: {
      color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
      icon: Check,
      label: 'Available',
      dot: 'bg-emerald-500'
    },
    FULL: {
      color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50',
      icon: Lock,
      label: 'Full',
      dot: 'bg-amber-500'
    },
    CANCELLED: {
      color: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50',
      icon: AlertCircle,
      label: 'Cancelled',
      dot: 'bg-red-500'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2'
  };

  return (
    <div className={`inline-flex items-center gap-2 ${sizeClasses[size]} rounded-full font-medium ${config.color} border`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`}></span>
      <Icon className={size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'} />
      {config.label}
    </div>
  );
}
