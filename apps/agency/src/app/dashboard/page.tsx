'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookingStatus,
  type BookingDetails,
  type VerificationStatusType,
  VerificationStatus,
} from '@ouiboo/types';
import { toPaginatedList } from '@ouiboo/utils';
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
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

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

const getBookingStatusMeta = (status: BookingStatus, t: TFunction) => {
  if (status === BookingStatus.Confirmed || status === BookingStatus.Completed) {
    return {
      className: 'bg-success/10 text-success',
      icon: CheckCircle2,
      label: status === BookingStatus.Completed ? t('dashboard.status.completed') : t('dashboard.status.confirmed'),
    };
  }

  if (status === BookingStatus.AwaitingValidation) {
    return {
      className: 'bg-warning/10 text-warning',
      icon: Clock,
      label: t('dashboard.status.pendingVerification'),
    };
  }

  if (status === BookingStatus.Rejected || status === BookingStatus.Cancelled) {
    return {
      className: 'bg-danger/10 text-danger',
      icon: AlertCircle,
      label: status === BookingStatus.Rejected ? t('dashboard.status.rejected') : t('dashboard.status.cancelled'),
    };
  }

  return {
    className: 'bg-primary/10 text-primary',
    icon: Clock,
    label: t('dashboard.status.pending'),
  };
};

export default function AgencyDashboard() {
  const { user, isLoading: isUserLoading } = useAuth();
  const { t } = useTranslation();

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
      const response = await apiClient.get('/agency/bookings', { params: { page: 1, limit: 5 } });
      return toPaginatedList<BookingDetails>(response.data).data;
    },
  });

  const rawCompanyName = user?.agencyProfile?.companyName || t('dashboard.yourAgency');
  // Capitalize display name (#73: "Bonjour, ouiboo" -> "Bonjour, Ouiboo")
  const companyName = rawCompanyName.charAt(0).toUpperCase() + rawCompanyName.slice(1);
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
      label: t('dashboard.availableBalance'),
      value: formatCurrency(stats.wallet.availableBalance || 0),
      currency: t('dashboard.currency'),
      icon: Wallet,
      color: 'bg-success',
      trend: t('dashboard.bookCount', { count: stats.totalBookings }),
      trendUp: true,
    },
    {
      label: t('dashboard.pendingEscrow'),
      value: formatCurrency(stats.wallet.pendingBalance || 0),
      currency: t('dashboard.currency'),
      icon: Clock,
      color: 'bg-warning',
      trend: t('dashboard.proofCount', { count: pendingPaymentReviews }),
      trendUp: null,
    },
    {
      label: t('dashboard.totalRevenue'),
      value: formatCurrency(stats.revenue || 0),
      currency: t('dashboard.currency'),
      icon: TrendingUp,
      color: 'bg-muted-foreground',
      trend: t('dashboard.travelerCount', { count: stats.totalCustomers }),
      trendUp: false,
    },
  ];

  const isVerified = verificationStatus === VerificationStatus.Verified;
  const quickActions = [
    {
      title: isVerified ? t('dashboard.quickActions.verifiedTitle') : t('dashboard.quickActions.finishVerificationTitle'),
      description: isVerified
        ? t('dashboard.quickActions.verifiedDescription')
        : t('dashboard.quickActions.finishVerificationDescription'),
      href: '/dashboard/onboarding',
      cta: isVerified ? t('dashboard.quickActions.verifiedCta') : t('dashboard.quickActions.finishVerificationCta'),
      icon: BadgeCheck,
      tone: isVerified ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning',
    },
    {
      title: t('dashboard.quickActions.publishTitle'),
      description: t('dashboard.quickActions.publishDescription', { count: stats.activeTrips }),
      href: '/dashboard/trips/create',
      cta: t('dashboard.quickActions.createTrip'),
      icon: FileText,
      tone: 'bg-primary/10 text-primary',
    },
    {
      title: t('dashboard.quickActions.reviewPaymentsTitle'),
      description: t('dashboard.quickActions.reviewPaymentsDescription', { count: pendingPaymentReviews }),
      href: '/dashboard/bookings',
      cta: t('dashboard.quickActions.openBookingsCta'),
      icon: CreditCard,
      tone: 'bg-success/10 text-success',
    },
    {
      title: t('dashboard.quickActions.followUpTitle'),
      description: t('dashboard.quickActions.followUpDescription', { count: bookingsNeedingAttention }),
      href: '/dashboard/bookings',
      cta: t('dashboard.quickActions.reviewBookingsCta'),
      icon: MessageSquareText,
      tone: 'bg-muted text-muted-foreground',
    },
  ];

  if (isUserLoading && statsLoading && bookingsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground font-semibold">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t('dashboard.loadingCommandCenter')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black font-display tracking-tight">{t('dashboard.greeting', { name: companyName })}</h1>
          <p className="text-muted-foreground font-medium mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl font-bold h-12 px-6 gap-2">
            <Calendar className="h-4 w-4" /> {t('dashboard.liveSnapshot')}
          </Button>
          <Link
            href="/dashboard/wallet"
            className="inline-flex items-center justify-center rounded-xl font-black h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t('dashboard.requestPayout')}
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
                      stat.trendUp ? 'text-success bg-success/10' : 'text-muted-foreground bg-muted',
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
            <h2 className="text-2xl font-black font-display tracking-tight">{t('dashboard.actionCenter')}</h2>
            <p className="text-muted-foreground font-medium">{t('dashboard.actionCenterSubtitle')}</p>
          </div>
          <Button asChild variant="ghost" className="font-bold text-primary gap-2 rounded-xl group">
              <Link href="/dashboard/bookings">{t('dashboard.openBookings')} <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></Link>
            </Button>
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
              <h2 className="text-2xl font-black font-display tracking-tight">{t('dashboard.recentBookings')}</h2>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('dashboard.recentRequestsCount', { count: latestBookings.length })}</p>
            </div>
          </div>
          <Button asChild variant="ghost" className="font-bold text-primary gap-2 rounded-xl group">
              <Link href="/dashboard/bookings">{t('dashboard.viewAll')} <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></Link>
            </Button>
        </div>

        <Card className="border-none shadow-xl shadow-black/5 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-none h-16">
                  <TableHead className="ps-10 font-bold uppercase text-[10px] tracking-widest">{t('dashboard.table.trip')}</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest">{t('dashboard.table.customer')}</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest">{t('dashboard.table.date')}</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-end">{t('dashboard.table.amount')}</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-end">{t('dashboard.table.status')}</TableHead>
                  <TableHead className="pe-10 text-end font-bold uppercase text-[10px] tracking-widest">{t('dashboard.table.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingsLoading ? (
                  <TableRow className="h-24">
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      {t('dashboard.loadingRecent')}
                    </TableCell>
                  </TableRow>
                ) : latestBookings.length === 0 ? (
                  <TableRow className="h-24">
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      {t('dashboard.noBookings')}
                    </TableCell>
                  </TableRow>
                ) : latestBookings.map((booking) => {
                  const status = getBookingStatusMeta(booking.status, t);
                  const StatusIcon = status.icon;

                  return (
                    <TableRow key={booking.id} className="h-24 hover:bg-muted/20 border-border/30">
                      <TableCell className="ps-10">
                        <div>
                          <p className="font-black text-foreground text-md leading-none mb-1">{booking.session.template.title}</p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{t('dashboard.bookingId', { id: booking.id.substring(0, 8) })}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-foreground/80">{booking.traveler.name || booking.fullName || booking.traveler.email}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-muted-foreground">{new Date(booking.bookingDate).toLocaleDateString()}</p>
                      </TableCell>
                      <TableCell className="text-end">
                        <span className="font-black text-foreground">{formatCurrency(Number(booking.totalAmount))}</span>
                        <span className="text-[10px] ms-1 font-bold text-muted-foreground uppercase">{t('dashboard.currency')}</span>
                      </TableCell>
                      <TableCell className="text-end">
                        <Badge className={cn('rounded-full px-4 py-1.5 font-black uppercase text-[9px] tracking-widest border-none shadow-sm', status.className)}>
                          <StatusIcon className="h-3 w-3 ms-1.5 inline" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="pe-10 text-end">
                        <Button asChild variant="ghost" size="icon" className="rounded-xl bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-all">
              <Link href="/dashboard/bookings"><Eye className="h-5 w-5" /></Link>
            </Button>
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
        <div className="relative z-10 space-y-4 max-w-xl text-center md:text-start">
          <h3 className="text-3xl font-black font-display tracking-tight leading-none">{t('dashboard.growTitle')}</h3>
          <p className="text-white/80 font-medium text-lg leading-relaxed">
            {t('dashboard.growBody', { tripCount: stats.activeTrips, travelerCount: stats.totalCustomers })}
          </p>
        </div>
        <Button asChild className="h-20 px-12 rounded-[2rem] bg-white text-primary hover:bg-slate-100 font-black text-xl border-none shadow-2xl transition-all hover:scale-105 active:scale-95">
              <Link href="/dashboard/trips/create">{t('dashboard.createNewTrip')}</Link>
            </Button>
      </div>
    </div>
  );
}
