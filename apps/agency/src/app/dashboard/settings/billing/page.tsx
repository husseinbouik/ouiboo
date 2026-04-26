'use client';

import Link from 'next/link';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CreditCard,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ouiboo/ui';
import { useQuery } from '@tanstack/react-query';
import { SubscriptionStatus, VerificationStatus } from '@ouiboo/types';
import { useAuth } from '@/components/AuthContext';
import { apiClient } from '@/lib/api-client';

type AgencyStatsResponse = {
  revenue?: number;
  totalBookings?: number;
  wallet?: {
    availableBalance?: number;
    pendingBalance?: number;
  };
};

const getSubscriptionMeta = (status?: string) => {
  switch (status) {
    case SubscriptionStatus.Active:
      return {
        badgeClassName: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Active',
        description: 'Your paid subscription is active.',
      };
    case SubscriptionStatus.Cancelled:
      return {
        badgeClassName: 'bg-rose-50 text-rose-700 border-rose-200',
        label: 'Cancelled',
        description: 'Your subscription has been cancelled.',
      };
    case SubscriptionStatus.Expired:
      return {
        badgeClassName: 'bg-slate-100 text-slate-700 border-slate-200',
        label: 'Expired',
        description: 'Your trial or subscription has expired.',
      };
    default:
      return {
        badgeClassName: 'bg-blue-50 text-blue-700 border-blue-200',
        label: 'Trial',
        description: 'You are currently using the MVP trial period.',
      };
  }
};

export default function BillingSettingsPage() {
  const { user } = useAuth();
  const agencyProfile = user?.agencyProfile;

  const { data: statsData } = useQuery<AgencyStatsResponse>({
    queryKey: ['agency-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/stats');
      return response.data;
    },
  });

  const subscriptionMeta = getSubscriptionMeta(agencyProfile?.subscriptionStatus);
  const trialEndsAt = agencyProfile?.trialEndsAt ? new Date(agencyProfile.trialEndsAt) : null;
  const subscriptionEndsAt = agencyProfile?.subscriptionEndsAt ? new Date(agencyProfile.subscriptionEndsAt) : null;
  const upcomingBoundary = subscriptionEndsAt || trialEndsAt;
  const hasBankDetails = Boolean(agencyProfile?.bankDetails || agencyProfile?.rib);
  const verificationState = agencyProfile?.verificationStatus || VerificationStatus.Pending;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-deep-blue dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to settings
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-deep-blue dark:text-gray-100">Billing & Subscription</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track the subscription state and payout readiness your team needs for day-to-day launch operations.
          </p>
        </div>
        <Link href="/dashboard/wallet">
          <Button className="bg-sunset-orange hover:bg-orange-600 border-none gap-2">
            Open wallet
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
        <CardHeader className="border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-sunset-orange" />
            Current Plan
          </CardTitle>
          <CardDescription>
            This page keeps plan visibility and payout readiness in one place for the launch MVP.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${subscriptionMeta.badgeClassName}`}>
              {subscriptionMeta.label}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{subscriptionMeta.description}</p>
              {upcomingBoundary && (
                <p className="text-sm text-muted-foreground">
                  Next billing boundary: {format(upcomingBoundary, 'MMM dd, yyyy')} ({formatDistanceToNowStrict(upcomingBoundary, { addSuffix: true })})
                </p>
              )}
              {!upcomingBoundary && (
                <p className="text-sm text-muted-foreground">
                  No billing deadline is set yet for this agency account.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current scope</p>
            <p className="text-sm text-foreground">
              This release covers plan state, verification readiness, and payout readiness without exposing unfinished billing controls.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <Wallet className="h-5 w-5 text-sunset-orange" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Available</span>
            </div>
            <p className="text-3xl font-black text-deep-blue dark:text-gray-100">
              {Number(statsData?.wallet?.availableBalance || 0).toLocaleString()} MAD
            </p>
            <p className="text-sm text-muted-foreground">Ready for payout requests.</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <CreditCard className="h-5 w-5 text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending</span>
            </div>
            <p className="text-3xl font-black text-deep-blue dark:text-gray-100">
              {Number(statsData?.wallet?.pendingBalance || 0).toLocaleString()} MAD
            </p>
            <p className="text-sm text-muted-foreground">Held until bookings clear and complete.</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <BadgeCheck className="h-5 w-5 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Revenue</span>
            </div>
            <p className="text-3xl font-black text-deep-blue dark:text-gray-100">
              {Number(statsData?.revenue || 0).toLocaleString()} MAD
            </p>
            <p className="text-sm text-muted-foreground">{statsData?.totalBookings || 0} total bookings tracked.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
              Compliance & Verification
            </CardTitle>
            <CardDescription>
              Your payout and launch readiness depend on verification and bank details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Verification status</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{verificationState}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bank details</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {hasBankDetails ? 'Configured and ready for payout requests' : 'Missing, payout requests are blocked'}
              </p>
            </div>
            <Link href="/dashboard/settings">
              <Button variant="outline">Update agency settings</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Launch Checklist
            </CardTitle>
            <CardDescription>
              Use this checklist to confirm the account is ready to operate before launch.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Keep verification approved so trip publishing and payouts stay available.</p>
            <p>Add bank details before requesting a payout from the wallet screen.</p>
            <p>Use wallet and analytics together to monitor available balance and booking revenue.</p>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link href="/dashboard/wallet">
                <Button>Manage payouts</Button>
              </Link>
              <Link href="/dashboard/analytics">
                <Button variant="outline">View revenue analytics</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
