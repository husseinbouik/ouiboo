'use client';

import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  Button,
  Input
} from '@ouiboo/ui';
import { 
  Search, 
  Download, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  Users
} from 'lucide-react';
import { BookingStatus } from '@ouiboo/types';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

export default function BookingsManager() {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['agency-bookings'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/bookings');
      return response.data;
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-deep-blue dark:text-gray-100">Booking Manager</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor your guests and track booking statuses.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 dark:border-slate-700 dark:text-gray-300">
            <Download className="h-4 w-4" /> Export Guest List
          </Button>
          <Link href="/dashboard/bookings/schedule">
            <Button className="bg-sunset-orange hover:bg-orange-600 gap-2 border-none">
              <Calendar className="h-4 w-4" /> View Schedule
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search by traveler name or booking ID..." 
            className="pl-10 h-11 dark:bg-slate-800 dark:border-slate-700"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" className="h-11 gap-2 border-dashed dark:border-slate-700 dark:text-gray-300">
            <Filter className="h-4 w-4" /> Filter Status
          </Button>
          <Button variant="outline" className="h-11 gap-2 border-dashed dark:border-slate-700 dark:text-gray-300">
            <Users className="h-4 w-4" /> All Sessions
          </Button>
        </div>
      </div>

      {/* Bookings Table */}
      <Card className="border-none shadow-sm overflow-hidden dark:bg-slate-900 border dark:border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-800 text-gray-700 dark:text-gray-300 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Traveler / Booking ID</th>
                  <th className="px-6 py-4">Trip & Session</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading bookings...</td>
                  </tr>
                ) : bookings?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No bookings found yet.</td>
                  </tr>
                ) : bookings?.map((booking: any) => (
                  <tr key={booking.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-deep-blue dark:text-gray-200">{booking.traveler?.name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{booking.id} • {booking.guestsCount} guests</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-300">{booking.session?.template?.title}</p>
                        <p className="text-xs text-sunset-orange dark:text-orange-400 font-medium">
                          {new Date(booking.session?.startDate).toLocaleDateString()} - {new Date(booking.session?.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-900 dark:text-gray-100">{booking.totalAmount.toLocaleString()} MAD</p>
                      <p className="text-[10px] text-gray-400">Recorded on {new Date(booking.bookingDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-inset ${
                        booking.status === BookingStatus.Confirmed ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-400/20" :
                        booking.status === BookingStatus.PendingPayment ? "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-400/20" :
                        "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-400/20"
                      }`}>
                        {booking.status === BookingStatus.Confirmed && <CheckCircle2 className="h-3 w-3" />}
                        {booking.status === BookingStatus.PendingPayment && <Clock className="h-3 w-3" />}
                        {booking.status === BookingStatus.Pending && <AlertCircle className="h-3 w-3" />}
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800">
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="flex items-start gap-4 p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 text-amber-800 dark:text-amber-400">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold">Important Notice</p>
          <p className="mt-1 opacity-90 leading-relaxed">
            As an agency, you have <strong>Read-Only</strong> access to booking verification. 
            Once a traveler uploads a payment proof, the Admin must verify the funds before the status changes to "Confirmed". 
            If you need to cancel a booking, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
