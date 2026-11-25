'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, Lock, type LucideIcon } from 'lucide-react';
import { getStatusTone, type StatusTone } from '@ouiboo/utils';

interface SessionStatusBadgeProps {
  status: 'OPEN' | 'FULL' | 'CANCELLED';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Session availability badge. #1029 (D4): the tone now comes from the
 * shared `@ouiboo/utils` status registry ('session' domain) instead
 * of a private colour map; the markup, dot, icons and i18n labels are
 * unchanged.
 */
const TONE_STYLES: Record<StatusTone, { color: string; dot: string }> = {
  success: { color: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  warning: { color: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' },
  danger: { color: 'bg-danger/10 text-danger border-danger/20', dot: 'bg-danger' },
  info: { color: 'bg-info/10 text-info border-info/20', dot: 'bg-info' },
  neutral: { color: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
};

const STATUS_ICONS: Record<SessionStatusBadgeProps['status'], LucideIcon> = {
  OPEN: Check,
  FULL: Lock,
  CANCELLED: AlertCircle,
};

const STATUS_LABEL_KEYS: Record<SessionStatusBadgeProps['status'], string> = {
  OPEN: 'status.sessionAvailable',
  FULL: 'status.sessionFull',
  CANCELLED: 'status.sessionCancelled',
};

export function SessionStatusBadge({ status, size = 'md' }: SessionStatusBadgeProps) {
  const { t } = useTranslation();

  const style = TONE_STYLES[getStatusTone('session', status)];
  const Icon = STATUS_ICONS[status];

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2'
  };

  return (
    <div className={`inline-flex items-center gap-2 ${sizeClasses[size]} rounded-full font-medium ${style.color} border`}>
      <span className={`w-2 h-2 rounded-full ${style.dot}`} aria-hidden="true"></span>
      <Icon className={size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true" />
      {t(STATUS_LABEL_KEYS[status])}
    </div>
  );
}
