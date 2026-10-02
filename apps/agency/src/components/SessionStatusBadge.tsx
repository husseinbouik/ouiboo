'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, Lock } from 'lucide-react';

interface SessionStatusBadgeProps {
  status: 'OPEN' | 'FULL' | 'CANCELLED';
  size?: 'sm' | 'md' | 'lg';
}

export function SessionStatusBadge({ status, size = 'md' }: SessionStatusBadgeProps) {
  const { t } = useTranslation();

  const statusConfig = {
    OPEN: {
      color: 'bg-success/10 text-success border-success/20',
      icon: Check,
      label: t('status.sessionAvailable'),
      dot: 'bg-success'
    },
    FULL: {
      color: 'bg-warning/10 text-warning border-warning/20',
      icon: Lock,
      label: t('status.sessionFull'),
      dot: 'bg-warning'
    },
    CANCELLED: {
      color: 'bg-danger/10 text-danger border-danger/20',
      icon: AlertCircle,
      label: t('status.sessionCancelled'),
      dot: 'bg-danger'
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
      <span className={`w-2 h-2 rounded-full ${config.dot}`} aria-hidden="true"></span>
      <Icon className={size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true" />
      {config.label}
    </div>
  );
}
