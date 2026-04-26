'use client';

import React from 'react';
import Link from 'next/link';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, Switch } from '@ouiboo/ui';
import { ArrowLeft, Bell, MailCheck, ShieldCheck, Wallet } from 'lucide-react';

export default function NotificationSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-deep-blue dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to settings
        </Link>
      </div>

      <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-sunset-orange" />
            Notifications
          </CardTitle>
          <CardDescription>
            Operational alerts stay enabled by default so agencies never miss booking, payout, or verification activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">Core email alerts</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Receive essential updates about bookings, proofs, payouts, and compliance.
              </p>
            </div>
            <Switch disabled checked />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MailCheck className="h-4 w-4 text-sunset-orange" />
                Booking updates
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                New reservations, cancellations, and payment-proof submissions.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Wallet className="h-4 w-4 text-blue-500" />
                Payout tracking
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Request confirmations, approvals, rejections, and paid-out updates.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Compliance notices
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Verification outcomes and readiness issues that affect publishing or payouts.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/40 dark:bg-blue-900/20">
            <div className="space-y-1">
              <Badge className="border-none bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                MVP Scope
              </Badge>
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Notification delivery is intentionally limited to essential email alerts in this release.
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-200/80">
                Channel-level controls stay hidden until they can be managed reliably end to end.
              </p>
            </div>
            <Link href="/dashboard/bookings" className="shrink-0">
              <Badge className="border-none bg-white text-deep-blue shadow-sm dark:bg-slate-900 dark:text-gray-100">
                Review bookings
              </Badge>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
