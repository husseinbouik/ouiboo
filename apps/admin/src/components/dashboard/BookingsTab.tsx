'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { LayoutDashboard } from 'lucide-react';
import { Button, Card, Badge, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@ouiboo/ui';
import { BookingPaymentStatus, PaymentMethod } from '@ouiboo/types';
import type { PaginationMeta } from '@ouiboo/utils';
import { apiClient } from '@/lib/api-client';
import type { AdminBooking, ApiErrorResponse, FeedbackState } from './types';
import { getErrorMessage } from './dashboard-utils';
import AdminActionModal from './AdminActionModal';
import { getAdminBookingBadgeLabel, getAdminBookingPaymentBadgeLabel, getAdminProofBankConfirmationMeta } from '../../app/status-mappers';

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
      void queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
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
    <div className={`animate-in fade-in slide-in-from-top-1 duration-150 text-sm font-medium ${bookingFeedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
      {bookingFeedback.message}
    </div>
  )}
  {repairFeedback && (
    <div className="text-sm font-medium text-success">{repairFeedback}</div>
  )}
  <div className="bg-card rounded-3xl overflow-hidden shadow-sm border border-border">
     <div className="overflow-x-auto">
     <Table>
        <TableHeader>
           <TableRow>
              <TableHead scope="col">{t('dashboard.table.booking')}</TableHead>
              <TableHead scope="col">{t('dashboard.table.traveler')}</TableHead>
              <TableHead scope="col">{t('dashboard.table.status')}</TableHead>
              <TableHead scope="col" className="text-end">{t('dashboard.table.amount')}</TableHead>
              <TableHead scope="col" className="text-end">{t('dashboard.table.action')}</TableHead>
           </TableRow>
        </TableHeader>
        <TableBody>
           {bookings.map((booking) => {
              const canRefund = booking.paymentMethod === PaymentMethod.Gateway
                && booking.paymentStatus === BookingPaymentStatus.Paid
                && Boolean(booking.paymentGatewayTransactionId);

              return (
              <TableRow key={booking.id}>
                 <TableCell>
                    <p className="font-bold text-sm line-clamp-1">{booking.session.template.title}</p>
                    <p className="text-[10px] text-muted-foreground font-mono italic">#{booking.id.substring(0, 8)}</p>
                    {/* #481 + B9: read-only terms-acceptance evidence —
                        the version the traveller accepted for this
                        booking, when the server recorded it, and the
                        checkout locale. Bookings with no recorded
                        version are pre-B9 rows: label them honestly as
                        unrecorded, never with a fabricated version. */}
                    {booking.termsVersion ? (
                      <p className="text-[10px] text-muted-foreground">
                        {t('dashboard.table.termsAccepted', { version: booking.termsVersion })}
                        {booking.termsAcceptedAt
                          ? ` · ${new Date(booking.termsAcceptedAt).toLocaleDateString()}`
                          : ''}
                        {booking.locale ? ` · ${booking.locale}` : ''}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">
                        {t('dashboard.table.termsUnrecorded')}
                      </p>
                    )}
                 </TableCell>
                 <TableCell className="text-sm font-medium">{booking.traveler.name}</TableCell>
                 <TableCell>
                  <div className="flex flex-col items-start gap-2">
                    <Badge className="font-black text-[8px] uppercase">{getAdminBookingBadgeLabel(booking.status, t)}</Badge>
                    <Badge variant="outline" className="text-[8px] font-black uppercase">
                      {getAdminBookingPaymentBadgeLabel(booking.paymentStatus, t)}
                    </Badge>
                    {/* #422: read-only bank-confirmation state of the booking's
                        proof — an ACCEPTED proof is explicitly not settled. */}
                    {(() => {
                      const bankMeta = getAdminProofBankConfirmationMeta(booking.paymentProof?.status, t);
                      return bankMeta ? (
                        <Badge className={`text-[8px] font-black uppercase ${bankMeta.className}`}>{bankMeta.label}</Badge>
                      ) : null;
                    })()}
                  </div>
                 </TableCell>
                 <TableCell className="text-end font-black">{booking.totalAmount} {booking.session.currency}</TableCell>
                 <TableCell className="text-end">
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
                 </TableCell>
</TableRow>
            )})}
         </TableBody>
      </Table>
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
