'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from '@ouiboo/ui';
import { CreditCard, ArrowLeft } from 'lucide-react';

export default function BillingSettingsPage() {
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
            <CreditCard className="h-5 w-5 text-sunset-orange" />
            Billing & Subscription
          </CardTitle>
          <CardDescription>
            Manage your Ouiboo subscription and invoices. This section is in preview for the MVP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            For this MVP version, your agency is on a free trial. When we launch paid plans, you&apos;ll be able
            to upgrade, manage payment methods, and download invoices from this page.
          </p>
          <Button disabled className="cursor-not-allowed opacity-60">
            Billing management coming soon
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

