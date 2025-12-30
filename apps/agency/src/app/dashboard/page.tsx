'use client';

import React from 'react';
import { 
  TrendingUp, 
  MapPin, 
  Users, 
  CreditCard,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ouiboo/ui';
import { cn } from '@ouiboo/ui/utils';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/AuthContext';
import { useTranslation } from 'react-i18next';

export default function AgencyDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['agency-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/stats');
      return response.data;
    }
  });

  const { data: recentTrips } = useQuery({
    queryKey: ['agency-trips'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/trips');
      return response.data;
    }
  });

  const dashboardStats = [
    { name: t('dashboard.stats.revenue'), value: `${statsData?.revenue?.toLocaleString() || 0} MAD`, icon: CreditCard, change: '+0%', color: 'text-green-600' },
    { name: t('dashboard.stats.activeTrips'), value: statsData?.activeTrips || 0, icon: MapPin, change: '+0', color: 'text-blue-600' },
    { name: t('dashboard.stats.totalBookings'), value: statsData?.totalBookings || 0, icon: TrendingUp, change: '+0%', color: 'text-deep-blue dark:text-blue-400' },
    { name: t('dashboard.stats.newCustomers'), value: statsData?.totalCustomers || 0, icon: Users, change: '+0', color: 'text-sunset-orange' },
  ];

  if (statsLoading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading stats...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-deep-blue dark:text-gray-100">
          {t('dashboard.greeting', { name: user?.name || 'Partner' })}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here's what's happening with your agency today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat) => (
          <Card key={stat.name} className="border-none shadow-sm hover:shadow-md transition-shadow dark:bg-slate-900 border dark:border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={stat.color}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">{stat.change}</span>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</p>
                <h3 className="text-2xl font-bold text-deep-blue dark:text-gray-100">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Trips */}
        <Card className="lg:col-span-2 border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Your Trips</CardTitle>
              <CardDescription className="dark:text-gray-400">{t('dashboard.tripsSubtitle')}</CardDescription>
            </div>
            <Link href="/dashboard/trips" className="text-sm font-semibold text-sunset-orange hover:underline flex items-center gap-1">
              {t('dashboard.viewAll')} <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTrips?.slice(0, 3).map((trip: any) => (
                <div key={trip.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors border border-transparent dark:border-slate-700/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-lg overflow-hidden">
                      <img 
                        src={trip.images?.[0] || `https://ui-avatars.com/api/?name=${trip.title}&background=1E3A8A&color=fff`} 
                        alt={trip.title} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-deep-blue dark:text-gray-100">{trip.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{trip.sessions?.[0]?.price?.toLocaleString() || 0} MAD</span>
                        <span className="w-1 h-1 bg-gray-300 dark:bg-slate-600 rounded-full"></span>
                        <span>{trip.sessions?.reduce((acc: number, s: any) => acc + (s._count?.bookings || 0), 0)} bookings</span>
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider",
                    trip.status === 'ACTIVE' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400"
                  )}>
                    {trip.status}
                  </span>
                </div>
              ))}
              {(!recentTrips || recentTrips.length === 0) && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 italic">
                  No trips created yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Tips */}
        <Card className="border-none bg-deep-blue dark:bg-blue-900 text-white shadow-lg overflow-hidden relative">
          <CardHeader>
            <CardTitle className="text-xl">Scale your reach</CardTitle>
            <CardDescription className="text-blue-100/70">Tips to get more bookings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="space-y-2">
              <p className="text-sm leading-relaxed">Agencies with professional photos get <span className="font-bold text-sunset-orange">3x more</span> bookings.</p>
              <button className="text-sm font-semibold text-white underline hover:text-sunset-orange transition-colors">Upload Photos</button>
            </div>
            <div className="pt-4 border-t border-white/10">
              <Link href="/dashboard/trips/create" className="block w-full py-3 bg-sunset-orange text-white text-center rounded-xl font-bold shadow-lg shadow-orange-900/40 hover:bg-orange-600 transition-all">
                {t('sidebar.createNew')}
              </Link>
            </div>
          </CardContent>
          {/* Decorative element */}
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-sunset-orange/20 rounded-full blur-3xl"></div>
        </Card>
      </div>
    </div>
  );
}
