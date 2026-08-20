'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookingStatus,
  type BookingDetails,
  type VerificationStatusType,
  VerificationStatus,
} from '@ouiboo/types';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
} from '@ouiboo/ui';
import {
  TrendingUp,
  Clock,
  ArrowUpRight,
  Wallet,
  Calendar,
  Eye,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  BadgeCheck,
  FileText,
  CreditCard,
  MessageSquareText,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@ouiboo/ui/utils';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/AuthContext';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

type AgencyStatsResponse = {
  activeTrips: number;
  revenue: number;
  totalBookings: number;
  totalCustomers: number;
  wallet: {
    availableBalance: number;
    pendingBalance: number;
  };
};

const formatCurrency = (amount: number) => amount.toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const getBookingStatusMeta = (status: BookingStatus) => {
  if (status === BookingStatus.Confirmed || status === BookingStatus.Completed) {
    return {
      className: 'bg-emerald-500/10 text-emerald-600',
      icon: CheckCircle2,
      label: status === BookingStatus.Completed ? 'Completed' : 'Confirmed',
    };
  }

  if (status === BookingStatus.AwaitingValidation) {
    return {
      className: 'bg-amber-500/10 text-amber-600',
      icon: Clock,
      label: 'Pending Verification',
    };
  }

  if (status === BookingStatus.Rejected || status === BookingStatus.Cancelled) {
    return {
      className: 'bg-rose-500/10 text-rose-600',
      icon: AlertCircle,
      label: status === BookingStatus.Rejected ? 'Rejected' : 'Cancelled',
    };
  }

  return {
    className: 'bg-blue-500/10 text-blue-600',
    icon: Clock,
    label: 'Pending',
  };
};

export default function AgencyDashboard() {
  const { user, isLoading: isUserLoading } = useAuth();

  const { data: statsData, isLoading: statsLoading } = useQuery<AgencyStatsResponse>({
    queryKey: ['agency-dashboard-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/stats');
      return response.data;
    },
  });

  const { data: recentBookings = [], isLoading: bookingsLoading } = useQuery<BookingDetails[]>({
    queryKey: ['agency-dashboard-bookings'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/bookings');
      return response.data;
    },
  });

  const companyName = user?.agencyProfile?.companyName || 'Your Agency';
  const stats = statsData || {
    revenue: 0,
    activeTrips: 0,
    totalBookings: 0,
    totalCustomers: 0,
    wallet: { availableBalance: 0, pendingBalance: 0 },
  };

  const pendingPaymentReviews = recentBookings.filter(
    (booking) => booking.paymentProof?.status === VerificationStatus.Pending,
  ).length;
  const bookingsNeedingAttention = recentBookings.filter(
    (booking) => booking.status === BookingStatus.AwaitingValidation || booking.status === BookingStatus.Pending,
  ).length;
  const latestBookings = recentBookings.slice(0, 5);
  const verificationStatus: VerificationStatusType | undefined = user?.agencyProfile?.verificationStatus;

  const summaryCards = [
    {
      label: 'Available Balance',
      value: formatCurrency(stats.wallet.availableBalance || 0),
      currency: 'MAD',
      icon: Wallet,
      color: 'bg-emerald-500',
      trend: `${stats.totalBookings} booking${stats.totalBookings === 1 ? '' : 's'}`,
      trendUp: true,
    },
    {
      label: 'Pending Escrow',
      value: formatCurrency(stats.wallet.pendingBalance || 0),
      currency: 'MAD',
      icon: Clock,
      color: 'bg-amber-500',
      trend: `${pendingPaymentReviews} proof${pendingPaymentReviews === 1 ? '' : 's'} to review`,
      trendUp: null,
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(stats.revenue || 0),
      currency: 'MAD',
      icon: TrendingUp,
      color: 'bg-slate-500',
      trend: `${stats.totalCustomers} traveler${stats.totalCustomers === 1 ? '' : 's'}`,
      trendUp: false,
    },
  ];

  const quickActions = [
    {
      title: verificationStatus === VerificationStatus.Verified ? 'Agency verified' : 'Complete verification',
      description: verificationStatus === VerificationStatus.Verified
        ? 'Your agency is verified. Keep your profile complete to stay payout-ready.'
        : 'Upload your documents and unlock higher withdrawal limits.',
      href: '/dashboard/onboarding',
      cta: verificationStatus === VerificationStatus.Verified ? 'Review onboarding' : 'Finish onboarding',
      icon: BadgeCheck,
      tone: verificationStatus === VerificationStatus.Verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
    },
    {
      title: 'Publish your next trip',
      description: `You currently have ${stats.activeTrips} active trip${stats.activeTrips === 1 ? '' : 's'} in market.`,
      href: '/dashboard/trips/create',
      cta: 'Create trip',
      icon: FileText,
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      title: 'Review pending payments',
      description: `${pendingPaymentReviews} traveler payment proof${pendingPaymentReviews === 1 ? '' : 's'} need a decision.`,
      href: '/dashboard/bookings',
      cta: 'Open bookings',
      icon: CreditCard,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      title: 'Stay close to new bookings',
      description: `${bookingsNeedingAttention} booking${bookingsNeedingAttention === 1 ? '' : 's'} still need follow-up or verification.`,
      href: '/dashboard/bookings',
      cta: 'Review bookings',
      icon: MessageSquareText,
      tone: 'bg-slate-100 text-slate-700',
    },
  ];

  if (isUserLoading && statsLoading && bookingsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground font-semibold">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading your command center...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black font-display tracking-tight">Bonjour, {companyName}</h1>
          <p className="text-muted-foreground font-medium mt-1">Here is your agency command center for bookings, payouts, and growth.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl font-bold h-12 px-6 gap-2">
            <Calendar className="h-4 w-4" /> Live Snapshot
          </Button>
          <Link href="/dashboard/wallet">
            <Button className="rounded-xl font-black h-12 px-8 bg-primary">Request Payout</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {summaryCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-none shadow-xl shadow-black/5 rounded-[2.5rem] overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg', stat.color)}>
                    <stat.icon className="h-7 w-7" />
                  </div>
                  {stat.trendUp !== null ? (
                    <div className={cn(
                      'flex items-center gap-1 text-xs font-black rounded-full px-3 py-1',
                      stat.trendUp ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 bg-slate-50',
                    )}>
                      {stat.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {stat.trend}
                    </div>
                  ) : (
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {stat.trend}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                  <h3 className="text-4xl font-black font-display tracking-tighter">
                    {stat.value} <span className="text-sm font-bold text-muted-foreground">{stat.currency}</span>
                  </h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black font-display tracking-tight">Action Center</h2>
            <p className="text-muted-foreground font-medium">Focus on the tasks that move revenue this week.</p>
          </div>
          <Link href="/dashboard/bookings">
            <Button variant="ghost" className="font-bold text-primary gap-2 rounded-xl group">
              Open bookings <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickActions.map((action) => (
            <Card key={action.title} className="border-none shadow-lg shadow-black/5 rounded-[2rem] overflow-hidden">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-foreground">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <div className={cn('h-12 w-12 rounded-2xl flex items-center justify-center', action.tone)}>
                    <action.icon className="h-6 w-6" />
                  </div>
                </div>
                <Link href={action.href} className="self-start">
                  <Button variant="outline" className="rounded-xl font-bold">
                    {action.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center bg-card p-6 rounded-[2rem] border border-border/50 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center"><AlertCircle className="h-5 w-5 text-primary" /></div>
            <div>
              <h2 className="text-2xl font-black font-display tracking-tight">Recent Bookings</h2>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{latestBookings.length} recent request{latestBookings.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <Link href="/dashboard/bookings">
            <Button variant="ghost" className="font-bold text-primary gap-2 rounded-xl group">
              View All <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <Card className="border-none shadow-xl shadow-black/5 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-none h-16">
                  <TableHead className="pl-10 font-bold uppercase text-[10px] tracking-widest">Trip</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest">Customer</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest">Date</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-right">Amount</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-right">Status</TableHead>
                  <TableHead className="pr-10 text-right font-bold uppercase text-[10px] tracking-widest">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingsLoading ? (
                  <TableRow className="h-24">
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Loading recent bookings...
                    </TableCell>
                  </TableRow>
                ) : latestBookings.length === 0 ? (
                  <TableRow className="h-24">
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      No bookings yet. Publish your next trip to start filling this table.
                    </TableCell>
                  </TableRow>
                ) : latestBookings.map((booking) => {
                  const status = getBookingStatusMeta(booking.status);
                  const StatusIcon = status.icon;

                  return (
                    <TableRow key={booking.id} className="h-24 hover:bg-muted/20 border-border/30">
                      <TableCell className="pl-10">
                        <div>
                          <p className="font-black text-foreground text-md leading-none mb-1">{booking.session.template.title}</p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Booking ID: #{booking.id.substring(0, 8)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-foreground/80">{booking.traveler.name || booking.fullName || booking.traveler.email}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-muted-foreground">{new Date(booking.bookingDate).toLocaleDateString()}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-black text-foreground">{formatCurrency(Number(booking.totalAmount))}</span>
                        <span className="text-[10px] ml-1 font-bold text-muted-foreground uppercase">MAD</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={cn('rounded-full px-4 py-1.5 font-black uppercase text-[9px] tracking-widest border-none shadow-sm', status.className)}>
                          <StatusIcon className="h-3 w-3 mr-1.5 inline" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-10 text-right">
                        <Link href="/dashboard/bookings">
                          <Button variant="ghost" size="icon" className="rounded-xl bg-muted/50 hover:bg-primary hover:text-white transition-all">
                            <Eye className="h-5 w-5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="bg-primary rounded-[3rem] p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between text-white shadow-2xl shadow-primary/20">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        <div className="relative z-10 space-y-4 max-w-xl text-center md:text-left">
          <h3 className="text-3xl font-black font-display tracking-tight leading-none">Ready to expand your reach?</h3>
          <p className="text-white/80 font-medium text-lg leading-relaxed">
            You have {stats.activeTrips} active trip{stats.activeTrips === 1 ? '' : 's'} and {stats.totalCustomers} traveler{stats.totalCustomers === 1 ? '' : 's'} in your audience. Add a fresh experience to keep momentum up.
          </p>
        </div>
        <Link href="/dashboard/trips/create" className="relative z-10 mt-8 md:mt-0">
          <Button className="h-20 px-12 rounded-[2rem] bg-white text-primary hover:bg-slate-100 font-black text-xl border-none shadow-2xl transition-all hover:scale-105 active:scale-95">
            Create New Trip
          </Button>
        </Link>
      </div>
    </div>
  );
}
