'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, Button, Input } from '@ouiboo/ui';
import { BadgeCheck, QrCode, TicketCheck } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface PassVerifyResult {
  valid: boolean;
  reason?: string;
  bookingId: string;
  status?: string;
  travelerName?: string | null;
  guestsCount?: number;
  tripTitle?: string;
  alreadyRedeemed?: boolean;
  passRedeemedAt?: string | null;
}

interface PassRedeemResult {
  redeemed: boolean;
  bookingId: string;
  status: string;
  passRedeemedAt: string;
}

/**
 * #753: the agency-side Booking Pass surface on the bookings screen.
 * Staff paste (or a scanner types) the traveller's pass token, verify
 * it, then redeem it. Verification alone never redeems; redemption is
 * the auditable, exactly-once fulfilment transition — the API refuses
 * a second redemption with 409 and this panel explains that state
 * instead of silently succeeding again.
 */
export function PassRedeemPanel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [token, setToken] = useState('');
  const [verified, setVerified] = useState<PassVerifyResult | null>(null);
  const [redeemed, setRedeemed] = useState<PassRedeemResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const errorMessage = (err: unknown, status?: number) => {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
    if (status === 409) return t('bookings.passRedeem.alreadyRedeemed');
    return typeof message === 'string' && message ? message : t('bookings.passRedeem.failed');
  };

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/bookings/pass/verify', { token: token.trim() });
      return response.data as PassVerifyResult;
    },
    onSuccess: (data) => {
      setError(null);
      setRedeemed(null);
      setVerified(data);
    },
    onError: (err) => {
      setVerified(null);
      setError(errorMessage(err));
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/bookings/pass/redeem', { token: token.trim() });
      return response.data as PassRedeemResult;
    },
    onSuccess: (data) => {
      setError(null);
      setRedeemed(data);
      void queryClient.invalidateQueries({ queryKey: ['agency-bookings'] });
    },
    onError: (err) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(errorMessage(err, status));
    },
  });

  const busy = verifyMutation.isPending || redeemMutation.isPending;

  return (
    <Card data-testid="pass-redeem-panel">
      <CardContent className="space-y-4 p-6">
        <div>
          <p className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-foreground">
            <QrCode className="h-4 w-4 text-sunset-orange" /> {t('bookings.passRedeem.title')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t('bookings.passRedeem.hint')}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
              setVerified(null);
              setRedeemed(null);
              setError(null);
            }}
            placeholder={t('bookings.passRedeem.placeholder')}
            aria-label={t('bookings.passRedeem.title')}
            className="flex-1"
          />
          <Button type="button" disabled={busy || !token.trim()} onClick={() => verifyMutation.mutate()}>
            {t('bookings.passRedeem.verify')}
          </Button>
          <Button
            type="button"
            disabled={busy || !verified?.valid || Boolean(redeemed) || verified?.alreadyRedeemed}
            onClick={() => redeemMutation.mutate()}
          >
            <TicketCheck className="mr-2 h-4 w-4" /> {t('bookings.passRedeem.redeem')}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {verified && !verified.valid && (
          <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">
            {t('bookings.passRedeem.invalid')}
          </p>
        )}
        {verified?.valid && (
          <p className="text-sm text-foreground">
            {t('bookings.passRedeem.validFor', {
              traveler: verified.travelerName ?? '',
              trip: verified.tripTitle ?? '',
            })}
            {verified.alreadyRedeemed
              ? ` — ${t('bookings.passRedeem.alreadyRedeemed')}`
              : ''}
          </p>
        )}
        {redeemed && (
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <BadgeCheck className="h-4 w-4" /> {t('bookings.passRedeem.redeemed')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
