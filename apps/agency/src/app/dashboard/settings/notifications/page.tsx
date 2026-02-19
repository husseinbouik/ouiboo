'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Switch, Label } from '@ouiboo/ui';
import { Bell, ArrowLeft } from 'lucide-react';

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
            Basic notification preferences. Advanced controls will arrive in a future release.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">Email updates</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Receive important updates about bookings and payouts.
              </p>
            </div>
            <Switch disabled checked />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            For the MVP, core operational emails (bookings, payouts, reviews) are always on.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

