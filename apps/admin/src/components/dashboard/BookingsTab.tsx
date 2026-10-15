'use client';

import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { Button, Card, Badge, Pagination } from '@ouiboo/ui';
import { BookingPaymentStatus, PaymentMethod } from '@ouiboo/types';
import type { PaginationMeta } from '@ouiboo/utils';
import type { AdminBooking, FeedbackState } from './types';
import { getAdminBookingBadgeLabel, getAdminBookingPaymentBadgeLabel } from '../../app/status-mappers';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type BookingsTabProps = {
  t: TFn;
  bookings: AdminBooking[];
  pagination: PaginationMeta | null;
  onPageChange: (page: number) => void;
  paginationLabels: {
    showing: string;
    of: string;
    pagination: string;
    previousPage: string;
    nextPage: string;
    goToPage: (page: number) => string;
  };
  bookingFeedback: FeedbackState | null;
  isRefunding: boolean;
  onRequestRefund: (booking: AdminBooking) => void;
};

export default function BookingsTab({
  t,
  bookings,
  pagination,
  onPageChange,
  paginationLabels,
  bookingFeedback,
  isRefunding,
  onRequestRefund,
}: BookingsTabProps) {
  return (
<div className="space-y-6 animate-in fade-in duration-500">
  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
     <LayoutDashboard className="h-5 w-5 text-sunset-orange" />
     {t('dashboard.sections.bookingMonitor')} ({pagination?.total ?? bookings.length})
  </h2>
  {bookingFeedback && (
    <div className={`text-sm font-medium ${bookingFeedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
      {bookingFeedback.message}
    </div>
  )}
  <div className="bg-card rounded-3xl overflow-hidden shadow-sm border border-border">
     <div className="overflow-x-auto">
     <table className="w-full text-start">
        <thead className="bg-muted text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
           <tr>
              <th className="px-6 py-4">{t('dashboard.table.booking')}</th>
              <th className="px-6 py-4">{t('dashboard.table.traveler')}</th>
              <th className="px-6 py-4">{t('dashboard.table.status')}</th>
              <th className="px-6 py-4 text-end">{t('dashboard.table.amount')}</th>
              <th className="px-6 py-4 text-end">{t('dashboard.table.action')}</th>
           </tr>
        </thead>
        <tbody className="divide-y divide-border">
           {bookings.map((booking) => {
              const canRefund = booking.paymentMethod === PaymentMethod.Gateway
                && booking.paymentStatus === BookingPaymentStatus.Paid
                && Boolean(booking.paymentGatewayTransactionId);

              return (
              <tr key={booking.id} className="hover:bg-muted/50 transition-colors">
                 <td className="px-6 py-4">
                    <p className="font-bold text-sm line-clamp-1">{booking.session.template.title}</p>
                    <p className="text-[10px] text-muted-foreground font-mono italic">#{booking.id.substring(0, 8)}</p>
                 </td>
                 <td className="px-6 py-4 text-sm font-medium">{booking.traveler.name}</td>
                 <td className="px-6 py-4">
                  <div className="flex flex-col items-start gap-2">
                    <Badge className="font-black text-[8px] uppercase">{getAdminBookingBadgeLabel(booking.status, t)}</Badge>
                    <Badge variant="outline" className="text-[8px] font-black uppercase">
                      {getAdminBookingPaymentBadgeLabel(booking.paymentStatus, t)}
                    </Badge>
                  </div>
                 </td>
                 <td className="px-6 py-4 text-end font-black">{booking.totalAmount} {booking.session.currency}</td>
                 <td className="px-6 py-4 text-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border"
                    disabled={!canRefund || isRefunding}
                    onClick={() => onRequestRefund(booking)}
                  >
                    {t('dashboard.actions.refund')}
                  </Button>
                 </td>
</tr>
            )})}
         </tbody>
      </table>
      </div>
   </div>
   <Pagination pagination={pagination} onPageChange={onPageChange} labels={paginationLabels} className="mt-2" />
</div>
  );
}
