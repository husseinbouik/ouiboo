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

const stats = [
  { name: 'Total Revenue', value: '45,231.00 MAD', icon: CreditCard, change: '+12.5%', color: 'text-green-600' },
  { name: 'Active Trips', value: '12', icon: MapPin, change: '+2', color: 'text-blue-600' },
  { name: 'Total Bookings', value: '156', icon: TrendingUp, change: '+18%', color: 'text-deep-blue' },
  { name: 'New Customers', value: '24', icon: Users, change: '+4', color: 'text-sunset-orange' },
];

const recentTrips = [
  { id: 1, name: 'Marrakech Desert Adventure', status: 'Active', bookings: 45, price: '1,200 MAD' },
  { id: 2, name: 'Chefchaouen Blue city Wander', status: 'Draft', bookings: 0, price: '850 MAD' },
  { id: 3, name: 'Sahara Stargazing Trek', status: 'Active', bookings: 28, price: '2,500 MAD' },
];

export default function AgencyDashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-deep-blue">Good Morning, John</h1>
        <p className="text-gray-500 mt-1">Here's what's happening with your agency today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={stat.color}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">{stat.change}</span>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <h3 className="text-2xl font-bold text-deep-blue">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Trips */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Your Trips</CardTitle>
              <CardDescription>Manage your current travel packages</CardDescription>
            </div>
            <Link href="/dashboard/trips" className="text-sm font-semibold text-sunset-orange hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTrips.map((trip) => (
                <div key={trip.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                      <img src={`https://ui-avatars.com/api/?name=${trip.name}&background=1E3A8A&color=fff`} alt={trip.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-deep-blue">{trip.name}</h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{trip.price}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span>{trip.bookings} bookings</span>
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full font-medium",
                    trip.status === 'Active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  )}>
                    {trip.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Tips */}
        <Card className="border-none bg-deep-blue text-white shadow-lg overflow-hidden relative">
          <CardHeader>
            <CardTitle className="text-xl">Scale your reach</CardTitle>
            <CardDescription className="text-blue-100">Tips to get more bookings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="space-y-2">
              <p className="text-sm leading-relaxed">Agencies with professional photos get <span className="font-bold text-sunset-orange">3x more</span> bookings.</p>
              <button className="text-sm font-semibold text-white underline hover:text-sunset-orange transition-colors">Upload Photos</button>
            </div>
            <div className="pt-4 border-t border-white/10">
              <Link href="/dashboard/trips/create" className="block w-full py-3 bg-sunset-orange text-center rounded-xl font-bold shadow-lg shadow-orange-900/20 hover:bg-orange-600 transition-all">
                Create New Package
              </Link>
            </div>
          </CardContent>
          {/* Decorative element */}
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-sunset-orange/10 rounded-full blur-3xl"></div>
        </Card>
      </div>
    </div>
  );
}
