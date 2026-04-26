'use client';

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
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
  Users,
  Eye
} from 'lucide-react';
import { BookingStatus, VerificationStatus, type BookingDetails } from '@ouiboo/types';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { PaymentProofReviewModal } from '@/components/PaymentProofReviewModal';
import { getAgencyBookingStatusMeta, getAgencyPaymentStatusMeta, getAgencyProofStatusLabel } from './booking-status';

export default function BookingsManager() {
  const [reviewingBooking, setReviewingBooking] = useState<BookingDetails | null>(null);

  const { data: bookings = [], isLoading } = useQuery<BookingDetails[]>({
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
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No bookings found yet.</td>
                  </tr>
                ) : bookings.map((booking) => {
                  const proofStatus = getAgencyProofStatusLabel(booking.paymentProof?.status);
                  const bookingStatusMeta = getAgencyBookingStatusMeta(booking.status);
                  const paymentStatusMeta = getAgencyPaymentStatusMeta(booking.paymentStatus);
                  return (
                  <tr key={booking.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-deep-blue dark:text-gray-200">{booking.traveler?.name || booking.fullName || 'Traveler'}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{booking.id} x {booking.guestsCount} guests</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-300">{booking.session.template.title}</p>
                        <p className="text-xs text-sunset-orange dark:text-orange-400 font-medium">
                          {new Date(booking.session.startDate).toLocaleDateString()} - {new Date(booking.session.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-900 dark:text-gray-100">{booking.totalAmount.toLocaleString()} MAD</p>
                      <p className="text-[10px] text-gray-400">Recorded on {new Date(booking.bookingDate).toLocaleDateString()}</p>
                      <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${paymentStatusMeta.className}`}>
                        {paymentStatusMeta.label}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-inset ${bookingStatusMeta.className}`}>
                        {booking.status === BookingStatus.Confirmed && <CheckCircle2 className="h-3 w-3" />}
                        {booking.status === BookingStatus.AwaitingValidation && <Clock className="h-3 w-3" />}
                        {booking.status === BookingStatus.Pending && <AlertCircle className="h-3 w-3" />}
                        {booking.status}
                      </span>
                      <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${proofStatus.className}`}>
                        {proofStatus.icon === 'verified' && <CheckCircle2 className="h-3 w-3" />}
                        {proofStatus.icon === 'pending' && <Clock className="h-3 w-3" />}
                        {(proofStatus.icon === 'missing' || proofStatus.icon === 'rejected') && <AlertCircle className="h-3 w-3" />}
                        {proofStatus.displayLabel}
                      </div>
                      {booking.paymentProof?.rejectionReason && (
                        <p className="mt-2 max-w-xs text-[11px] font-medium text-rose-600 dark:text-rose-400">
                          Proof note: {booking.paymentProof.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      {booking.paymentProof?.imageUrl ? (
                        <Button 
                          variant={booking.paymentProof?.status === VerificationStatus.Pending ? 'default' : 'outline'} 
                          size="sm" 
                          className={`opacity-0 group-hover:opacity-100 transition-opacity gap-2 ${
                            booking.paymentProof?.status === VerificationStatus.Pending 
                              ? 'bg-deep-blue hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700' 
                              : 'dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800'
                          }`}
                          onClick={() => setReviewingBooking(booking)}
                        >
                          <Eye className="h-4 w-4" /> Inspect Proof
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity dark:text-gray-500 dark:border-slate-700 cursor-not-allowed"
                          disabled
                        >
                          No Proof
                        </Button>
                      )}
                    </td>
                  </tr>
                  );
                })}
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
            Agencies can inspect uploaded bank-transfer proofs and follow booking progress from this screen.
            Payment confirmation is finalized by the <strong>Admin finance review</strong> flow, which updates the
            traveler, agency wallet, and payout state in one place.
          </p>
        </div>
      </div>
      {/* Payment Proof Review Modal */}
      <PaymentProofReviewModal
        isOpen={!!reviewingBooking}
        onClose={() => setReviewingBooking(null)}
        booking={reviewingBooking}
        readOnly
      />
    </div>
  );
}
