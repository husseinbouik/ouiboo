'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, MapPin, MessageCircle, QrCode } from 'lucide-react';
import { Card } from '@ouiboo/ui';
import type { BookingDetails, BookingPass } from '@ouiboo/types';
import { apiClient } from '@/lib/api-client';
import { agencyWhatsAppHref } from '@/lib/support';
import { formatCurrency } from '@ouiboo/utils';

/**
 * #689 (Council S6): the Booking Pass on the booking view — the booking
 * page IS the receipt. The pass exists only once the AGENCY has
 * confirmed receipt of the deposit in its own bank account; it names
 * the agency as the seller/payee and states that Ouiboo holds no
 * funds. The QR carries a signed token that verifies ONLY inside an
 * authenticated agency session (an unauthenticated scan resolves
 * nothing). The exact meeting point unlocks here with the pass.
 *
 * #690: once loaded, the pass artefact is kept on the device
 * (localStorage) so it renders offline at the meeting point; the
 * cached copy is replaced on every successful load and is the only
 * authenticated artefact the offline path serves.
 */
const passCacheKey = (bookingId: string) => `ouiboo-booking-pass:${bookingId}`;

function readCachedPass(bookingId: string): BookingPass | null {
  try {
    const raw = window.localStorage.getItem(passCacheKey(bookingId));
    return raw ? (JSON.parse(raw) as BookingPass) : null;
  } catch {
    return null;
  }
}

export function BookingPassCard({ booking }: { booking: BookingDetails }) {
  const { t, i18n } = useTranslation();
  const bookingId = booking.id;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [cachedPass, setCachedPass] = useState<BookingPass | null>(null);

  useEffect(() => {
    setCachedPass(readCachedPass(bookingId));
  }, [bookingId]);

  const { data: livePass } = useQuery<BookingPass | null>({
    queryKey: ['booking-pass', bookingId],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/bookings/${bookingId}/pass`);
        return response.data as BookingPass;
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    if (livePass) {
      setCachedPass(livePass);
      try {
        window.localStorage.setItem(passCacheKey(bookingId), JSON.stringify(livePass));
      } catch {
        // Storage full/blocked: the live pass still renders.
      }
    }
  }, [livePass, bookingId]);

  const pass = livePass ?? cachedPass;
  const offline = !livePass && Boolean(cachedPass);

  useEffect(() => {
    let cancelled = false;
    if (!pass?.token) {
      setQrDataUrl(null);
      return;
    }
    void import('qrcode')
      .then((QRCode) => QRCode.toDataURL(pass.token, { margin: 1, width: 220 }))
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pass?.token]);

  if (!pass) {
    return (
      <Card className="rounded-3xl border border-border shadow-sm bg-card" data-testid="booking-pass-pending">
        <div className="p-8 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <QrCode className="h-4 w-4 text-sunset-orange" /> {t('bookingPass.title')}
          </p>
          <p className="text-sm text-muted-foreground">{t('bookingPass.pending')}</p>
        </div>
      </Card>
    );
  }

  const agency = booking.session.template.agency;
  const sellerName = pass.seller.legalName || pass.seller.companyName;
  const contactPhone = agency.businessPhone || agency.emergencyContactPhone;
  const whatsappHref = agencyWhatsAppHref(contactPhone, t('bookingPass.whatsappGreeting', { seller: sellerName }));
  const planStatus = booking.paymentPlan?.status;
  const stateKey =
    booking.refundStatus || planStatus === 'REFUND_DUE'
      ? 'refundDue'
      : planStatus === 'BALANCE_DUE'
        ? 'balanceDue'
        : planStatus === 'FULLY_PAID'
          ? 'fullyPaid'
          : 'depositConfirmed';

  return (
    <Card className="rounded-3xl border border-border shadow-sm bg-card" data-testid="booking-pass">
      <div className="p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-emerald-600" /> {t('bookingPass.title')}
            </p>
            <h2 className="mt-2 text-2xl font-black font-display tracking-tight text-foreground">
              {t(`bookingPass.state.${stateKey}`)}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t('bookingPass.paidToAgency', { seller: sellerName })}
            </p>
            <p className="text-sm font-semibold text-foreground">{t('bookingPass.noFundsHeld')}</p>
            {offline && <p className="mt-1 text-xs text-muted-foreground">{t('bookingPass.offlineCopy')}</p>}
          </div>
          {qrDataUrl && (
            <div className="rounded-2xl border border-border/60 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt={t('bookingPass.qrAlt')} width={160} height={160} />
              <p className="mt-2 text-center text-[10px] font-semibold text-slate-600">{t('bookingPass.qrHint')}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('bookingPass.total')}</p>
            <p className="mt-2 font-semibold text-foreground">
              {formatCurrency(pass.totalAmount, pass.currency, i18n.language)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              {t('bookingPass.confirmedReceived')}
            </p>
            <p className="mt-2 font-semibold text-foreground">
              {pass.depositConfirmedAmount
                ? formatCurrency(pass.depositConfirmedAmount, pass.currency, i18n.language)
                : t('bookingPass.notProvided')}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('bookingPass.balance')}</p>
            <p className="mt-2 font-semibold text-foreground">
              {pass.balanceAmount ? formatCurrency(pass.balanceAmount, pass.currency, i18n.language) : t('bookingPass.notProvided')}
            </p>
          </div>
        </div>

        {pass.meetingPoint && (pass.meetingPoint.address || pass.meetingPoint.mapsUrl) && (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-5" data-testid="booking-pass-meeting-point">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t('bookingPass.meetingPoint')}
            </p>
            <div className="mt-3 space-y-2 text-sm">
              {pass.meetingPoint.address && <p className="font-semibold text-foreground">{pass.meetingPoint.address}</p>}
              {pass.meetingPoint.pickupAvailable && (
                <p className="text-muted-foreground">{t('bookingPass.pickupAvailable')}</p>
              )}
              {pass.meetingPoint.mapsUrl && (
                <a
                  href={pass.meetingPoint.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-sunset-orange hover:underline"
                >
                  <MapPin className="h-4 w-4" /> {t('bookingPass.viewOnMap')}
                </a>
              )}
            </div>
          </div>
        )}

        {pass.passCheckInAt && (
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            {t('bookingPass.checkedIn', {
              date: new Intl.DateTimeFormat(i18n.language || 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(
                new Date(pass.passCheckInAt),
              ),
            })}
          </p>
        )}

        {whatsappHref && (
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-5 text-xs font-black uppercase tracking-widest"
            >
              <MessageCircle className="h-4 w-4" /> {t('bookingPass.whatsappAgency')}
            </a>
            <span className="text-xs text-muted-foreground">{t('bookingPass.whatsappNote')}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
