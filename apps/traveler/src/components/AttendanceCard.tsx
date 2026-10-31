'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Button, Card } from '@ouiboo/ui';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import type { BookingDetails } from '@ouiboo/types';
import { apiClient } from '@/lib/api-client';

/**
 * #693 (Council S6): attendance transparency. The agency records
 * attendance after the trip and that record gates review eligibility —
 * so the traveller must be able to SEE it, see the independent QR
 * check-in signal (#689), and DISPUTE a wrong record through a defined
 * path. A dispute is stamped and resolved under the published
 * review-moderation rules (help surface); it never silently rewrites
 * the record here.
 */
export function AttendanceCard({ booking }: { booking: BookingDetails }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const disputeMutation = useMutation({
    mutationFn: async (disputeReason: string) => {
      await apiClient.post(`/bookings/${booking.id}/attendance-dispute`, { reason: disputeReason });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['booking-details-page', booking.id] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setDisputeOpen(false);
      setError(null);
    },
    onError: () => {
      setError(t('attendance.actionFailed'));
    },
  });

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(i18n.language || 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

  const statusKey = !booking.attendance
    ? 'notRecorded'
    : booking.attendance === 'ATTENDED'
      ? 'attended'
      : 'noShow';

  return (
    <Card className="rounded-3xl border border-border shadow-sm bg-card" data-testid="attendance-card">
      <div className="p-8 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-sunset-orange" /> {t('attendance.title')}
        </p>
        <p className="text-sm font-semibold text-foreground">{t(`attendance.status.${statusKey}`)}</p>
        {booking.attendanceRecordedAt && (
          <p className="text-sm text-muted-foreground">
            {t('attendance.recordedOn', { date: formatDate(booking.attendanceRecordedAt) })}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {booking.passCheckInAt
            ? t('attendance.qrCheckedIn', { date: formatDate(booking.passCheckInAt) })
            : t('attendance.qrNotCheckedIn')}
        </p>
        <p className="text-sm text-muted-foreground">{t('attendance.reviewGateNote')}</p>

        {booking.attendance && !booking.attendanceDisputedAt && (
          <>
            {disputeOpen ? (
              <div className="space-y-3">
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={t('attendance.disputePlaceholder')}
                  aria-label={t('attendance.disputePlaceholder')}
                  rows={3}
                  maxLength={1000}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <Button
                  variant="outline"
                  className="h-11 px-5 rounded-xl text-xs font-black uppercase tracking-widest"
                  disabled={disputeMutation.isPending || !reason.trim()}
                  onClick={() => disputeMutation.mutate(reason.trim())}
                >
                  {disputeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('attendance.disputeSubmit')}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="h-11 px-5 rounded-xl text-xs font-black uppercase tracking-widest border border-border/60"
                onClick={() => setDisputeOpen(true)}
              >
                {t('attendance.disputeButton')}
              </Button>
            )}
          </>
        )}
        {booking.attendanceDisputedAt && (
          <p className="text-sm font-semibold text-foreground">
            {t('attendance.disputedOn', { date: formatDate(booking.attendanceDisputedAt) })}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm font-semibold text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          <Link href="/help" className="font-semibold text-sunset-orange hover:underline">
            {t('attendance.moderationRulesLink')}
          </Link>
        </p>
      </div>
    </Card>
  );
}
