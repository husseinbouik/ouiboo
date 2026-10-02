'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, Switch } from '@ouiboo/ui';
import { ArrowLeft, Bell, MailCheck, ShieldCheck, Wallet } from 'lucide-react';

export default function NotificationSettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3 rtl:rotate-180" />
          {t('settings.backToSettings')}
        </Link>
      </div>

      <Card className="border-none shadow-sm bg-card border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent" />
            {t('settings.notifications.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.notifications.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">{t('settings.notifications.coreAlerts')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('settings.notifications.coreAlertsHint')}
              </p>
            </div>
            <Switch disabled checked aria-label={t('settings.notifications.coreAlerts')} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MailCheck className="h-4 w-4 text-accent" />
                {t('settings.notifications.bookingUpdates')}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('settings.notifications.bookingUpdatesHint')}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Wallet className="h-4 w-4 text-primary" />
                {t('settings.notifications.payoutTracking')}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('settings.notifications.payoutTrackingHint')}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-success" />
                {t('settings.notifications.complianceNotices')}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('settings.notifications.complianceNoticesHint')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
            <div className="space-y-1">
              <Badge className="border-none bg-primary/15 text-primary">
                {t('settings.notifications.mvpScope')}
              </Badge>
              <p className="text-sm text-foreground">
                {t('settings.notifications.mvpBody')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('settings.notifications.mvpHint')}
              </p>
            </div>
            <Link href="/dashboard/bookings" className="shrink-0">
              <Badge className="border-none bg-card text-foreground shadow-sm">
                {t('settings.notifications.reviewBookings')}
              </Badge>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
