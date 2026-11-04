'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@ouiboo/ui';
import { BellRing } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  PushStatus,
  getCurrentPushSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push-notifications';

type ToggleState = 'loading' | PushStatus;

/**
 * #784: opt-in control for web push, shown on the notifications page
 * (the traveller notification-preferences surface). Push is a channel
 * on top of the existing per-category preferences — turning it on
 * subscribes this browser; turning it off removes this browser's
 * subscription and switches the channel off server-side.
 * Unsupported browsers and denied permissions render an explanation
 * instead of a dead button.
 */
export function PushNotificationToggle() {
  const { t } = useTranslation();
  const [state, setState] = useState<ToggleState>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isPushSupported()) {
        if (!cancelled) setState('unsupported');
        return;
      }
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        if (!cancelled) setState('denied');
        return;
      }
      const subscription = await getCurrentPushSubscription().catch(() => null);
      if (!cancelled) setState(subscription ? 'subscribed' : 'unsubscribed');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnable = async () => {
    setBusy(true);
    const result = await subscribeToPush();
    setState(result === 'error' ? 'unsubscribed' : result);
    setBusy(false);
  };

  const handleDisable = async () => {
    setBusy(true);
    const result = await unsubscribeFromPush();
    setState(result === 'error' ? 'subscribed' : result);
    setBusy(false);
  };

  if (state === 'loading') return null;

  return (
    <div
      data-testid="push-notification-toggle"
      className="bg-card rounded-2xl border border-border p-4 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
          <BellRing className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold">{t('notifications.push.title')}</p>
          <p className="text-sm text-muted-foreground">
            {state === 'subscribed' && t('notifications.push.subscribedBody')}
            {state === 'unsubscribed' && t('notifications.push.unsubscribedBody')}
            {state === 'denied' && t('notifications.push.deniedBody')}
            {state === 'unsupported' && t('notifications.push.unsupportedBody')}
            {state === 'unavailable' && t('notifications.push.unavailableBody')}
          </p>
        </div>
      </div>
      {state === 'unsubscribed' || state === 'unavailable' ? (
        <Button onClick={handleEnable} disabled={busy}>
          {t('notifications.push.enable')}
        </Button>
      ) : null}
      {state === 'subscribed' ? (
        <Button variant="outline" onClick={handleDisable} disabled={busy}>
          {t('notifications.push.disable')}
        </Button>
      ) : null}
    </div>
  );
}
