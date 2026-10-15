'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import {
  BookingPaymentStatus,
  BookingStatus,
  VerificationStatus,
  type BookingDetails,
  type BookingPaymentStatusType,
  type BookingStatusType,
} from '@ouiboo/types';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { PaymentProofReviewModal } from '@/components/PaymentProofReviewModal';
import { getAgencyBookingStatusMeta, getAgencyPaymentStatusMeta, getAgencyProofStatusLabel, formatCurrency, formatLocalDate } from '@ouiboo/utils';
import { Pagination } from '@ouiboo/ui';
import { toPaginatedList } from '@ouiboo/utils';

export default function BookingsManager() {
  const { t, i18n } = useTranslation();
  const [reviewingBooking, setReviewingBooking] = useState<BookingDetails | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: result, isLoading } = useQuery({
    queryKey: ['agency-bookings', currentPage],
    queryFn: async () => {
      const response = await apiClient.get('/agency/bookings', { params: { page: currentPage, limit: 10 } });
      return toPaginatedList<BookingDetails>(response.data);
    },
  });

  const bookings = result?.data ?? [];
  const bookingsPagination = result?.pagination ?? null;

  const bookingStatusLabel = (status: BookingStatusType) => {
    switch (status) {
      case BookingStatus.Confirmed:
        return t('status.bookingConfirmed');
      case BookingStatus.AwaitingValidation:
        return t('status.bookingAwaitingValidation');
      case BookingStatus.Pending:
        return t('status.bookingPending');
      case BookingStatus.Rejected:
        return t('status.bookingRejected');
      case BookingStatus.Cancelled:
        return t('status.bookingCancelled');
      case BookingStatus.Completed:
        return t('status.bookingCompleted');
      default:
        return status;
    }
  };

  const paymentStatusLabel = (status: BookingPaymentStatusType) => {
    switch (status) {
      case BookingPaymentStatus.Paid:
        return t('status.paymentPaid');
      case BookingPaymentStatus.Failed:
        return t('status.paymentFailed');
      case BookingPaymentStatus.Refunded:
        return t('status.paymentRefunded');
      default:
        return t('status.paymentUnpaid');
    }
  };

  const proofStatusLabel = (icon: string) => {
    switch (icon) {
      case 'verified':
        return t('status.proofVerified');
      case 'rejected':
        return t('status.proofRejected');
      case 'pending':
        return t('status.proofAwaitingReview');
      default:
        return t('status.proofNotUploaded');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('bookings.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('bookings.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> {t('bookings.exportGuestList')}
          </Button>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 border-none">
              <Link href="/dashboard/bookings/schedule"><Calendar className="h-4 w-4" /> {t('bookings.viewSchedule')}</Link>
            </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl shadow-sm border border-border transition-colors">
        <div className="relative flex-1 w-full">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('bookings.searchPlaceholder')}
            aria-label={t('bookings.searchPlaceholder')}
            className="ps-10 h-11"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" className="h-11 gap-2 border-dashed">
            <Filter className="h-4 w-4" /> {t('bookings.filterStatus')}
          </Button>
          <Button variant="outline" className="h-11 gap-2 border-dashed">
            <Users className="h-4 w-4" /> {t('bookings.allSessions')}
          </Button>
        </div>
      </div>

      {/* Bookings Table */}
      <Card className="shadow-sm overflow-hidden bg-card border border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">{t('bookings.colTraveler')}</th>
                  <th className="px-6 py-4">{t('bookings.colTrip')}</th>
                  <th className="px-6 py-4">{t('bookings.colAmount')}</th>
                  <th className="px-6 py-4">{t('bookings.colStatus')}</th>
                  <th className="px-6 py-4 text-end">{t('bookings.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">{t('bookings.loading')}</td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">{t('bookings.empty')}</td>
                  </tr>
                ) : bookings.map((booking) => {
                  const proofStatus = getAgencyProofStatusLabel(booking.paymentProof?.status);
                  const bookingStatusMeta = getAgencyBookingStatusMeta(booking.status);
                  const paymentStatusMeta = getAgencyPaymentStatusMeta(booking.paymentStatus);
                  return (
                  <tr key={booking.id} className="hover:bg-muted/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{booking.traveler?.name || booking.fullName || t('bookings.travelerFallback')}</p>
                          <p className="text-xs text-muted-foreground">{t('bookings.guestsCount', { id: booking.id, count: booking.guestsCount })}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div>
                        <p className="font-semibold text-foreground">{booking.session.template.title}</p>
                        <p className="text-xs text-accent font-medium">
                          {t('bookings.sessionRange', {
                            start: formatLocalDate(booking.session.startDate, i18n.language, { dateStyle: 'medium' }),
                            end: formatLocalDate(booking.session.endDate, i18n.language, { dateStyle: 'medium' }),
                          })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-foreground">{formatCurrency(booking.totalAmount, booking.currency, i18n.language)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t('bookings.recordedOn', { date: formatLocalDate(booking.bookingDate, i18n.language, { dateStyle: 'medium' }) })}
                      </p>
                      <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${paymentStatusMeta.className}`}>
                        {paymentStatusLabel(booking.paymentStatus)}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-inset ${bookingStatusMeta.className}`}>
                        {booking.status === BookingStatus.Confirmed && <CheckCircle2 className="h-3 w-3" />}
                        {booking.status === BookingStatus.AwaitingValidation && <Clock className="h-3 w-3" />}
                        {booking.status === BookingStatus.Pending && <AlertCircle className="h-3 w-3" />}
                        {bookingStatusLabel(booking.status)}
                      </span>
                      <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${proofStatus.className}`}>
                        {proofStatus.icon === 'verified' && <CheckCircle2 className="h-3 w-3" />}
                        {proofStatus.icon === 'pending' && <Clock className="h-3 w-3" />}
                        {(proofStatus.icon === 'missing' || proofStatus.icon === 'rejected') && <AlertCircle className="h-3 w-3" />}
                        {proofStatusLabel(proofStatus.icon)}
                      </div>
                      {booking.paymentProof?.rejectionReason && (
                        <p className="mt-2 max-w-xs text-[11px] font-medium text-danger">
                          {t('bookings.proofNote', { reason: booking.paymentProof.rejectionReason })}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-5 text-end">
                      {booking.paymentProof?.imageUrl ? (
                        <Button
                          variant={booking.paymentProof?.status === VerificationStatus.Pending ? 'default' : 'outline'}
                          size="sm"
                          className={`opacity-0 group-hover:opacity-100 transition-opacity gap-2 ${
                            booking.paymentProof?.status === VerificationStatus.Pending
                              ? 'bg-primary hover:bg-primary/90'
                              : ''
                          }`}
                          onClick={() => setReviewingBooking(booking)}
                        >
                          <Eye className="h-4 w-4" /> {t('bookings.inspectProof')}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed"
                          disabled
                        >
                          {t('bookings.noProof')}
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

      <Pagination pagination={bookingsPagination} onPageChange={setCurrentPage} className="mt-4" />

      {/* Info Box */}
      <div className="flex items-start gap-4 p-6 bg-warning/10 rounded-2xl border border-warning/20 text-warning">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold">{t('bookings.importantNotice')}</p>
          <p className="mt-1 opacity-90 leading-relaxed">
            {t('bookings.importantNoticeBody')}
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
