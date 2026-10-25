'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { LayoutDashboard } from 'lucide-react';
import { Button, Card, Badge, Pagination } from '@ouiboo/ui';
import { BookingPaymentStatus, PaymentMethod } from '@ouiboo/types';
import type { PaginationMeta } from '@ouiboo/utils';
import { apiClient } from '@/lib/api-client';
import type { AdminBooking, ApiErrorResponse, FeedbackState } from './types';
import { getErrorMessage } from './dashboard-utils';
import AdminActionModal from './AdminActionModal';
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

type BookingRepairAction = 'resync-payment-state' | 'requeue-proof-review' | 'open-refund-case';

const BOOKING_REPAIR_ACTIONS: BookingRepairAction[] = [
  'resync-payment-state',
  'requeue-proof-review',
  'open-refund-case',
];

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
  const queryClient = useQueryClient();
  const [repairTarget, setRepairTarget] = useState<AdminBooking | null>(null);
  const [repairAction, setRepairAction] = useState<BookingRepairAction>('resync-payment-state');
  const [repairError, setRepairError] = useState<string | null>(null);
  const [repairFeedback, setRepairFeedback] = useState<string | null>(null);

  const repairMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: BookingRepairAction; reason: string }) => {
      await apiClient.post(`/admin/bookings/${id}/repair`, { action, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
      setRepairTarget(null);
      setRepairError(null);
      setRepairFeedback(t('dashboard.groups.success'));
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      setRepairError(getErrorMessage(error, t('dashboard.interventions.failed')));
    },
  });

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
  {repairFeedback && (
    <div className="text-sm font-medium text-success">{repairFeedback}</div>
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
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border"
                      disabled={!canRefund || isRefunding}
                      onClick={() => onRequestRefund(booking)}
                    >
                      {t('dashboard.actions.refund')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={repairMutation.isPending}
                      onClick={() => {
                        setRepairError(null);
                        setRepairFeedback(null);
                        setRepairAction('resync-payment-state');
                        setRepairTarget(booking);
                      }}
                    >
                      {t('dashboard.interventions.repair')}
                    </Button>
                  </div>
                 </td>
</tr>
            )})}
         </tbody>
      </table>
      </div>
   </div>
   <Pagination pagination={pagination} onPageChange={onPageChange} labels={paginationLabels} className="mt-2" />
   {repairTarget && (
     <AdminActionModal
       t={t}
       title={t('dashboard.interventions.bookingRepair.title')}
       description={t('dashboard.interventions.bookingRepair.description')}
       confirmLabel={t('dashboard.interventions.repair')}
       pending={repairMutation.isPending}
       error={repairError}
       onClose={() => setRepairTarget(null)}
       onSubmit={(reason) => repairMutation.mutate({ id: repairTarget.id, action: repairAction, reason })}
     >
       <div className="space-y-2">
         <label
           htmlFor="booking-repair-action"
           className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
         >
           {t('dashboard.interventions.repairActionLabel')}
         </label>
         <select
           id="booking-repair-action"
           value={repairAction}
           onChange={(event) => setRepairAction(event.target.value as BookingRepairAction)}
           className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-orange/20"
         >
           {BOOKING_REPAIR_ACTIONS.map((action) => (
             <option key={action} value={action}>
               {t(`dashboard.interventions.bookingRepair.${action}`)}
             </option>
           ))}
         </select>
         <p className="text-xs text-muted-foreground">
           {t(`dashboard.interventions.bookingRepair.${repairAction}Hint`)}
         </p>
       </div>
     </AdminActionModal>
   )}
</div>
  );
}
