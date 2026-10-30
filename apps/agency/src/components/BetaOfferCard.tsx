'use client';

import { Clock3, Handshake, MessagesSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@ouiboo/ui';
import { BETA_AGENCY_OFFER } from '@ouiboo/types';

/**
 * #677 (Council S6): the beta agency offer pack, rendered wherever an
 * agency meets the offer — onboarding and the support page. The three
 * published promises, driven by the BETA_AGENCY_OFFER configuration in
 * @ouiboo/types so the wording can never drift per surface:
 *  1. the 48-working-hour verification SLA for the licence+insurance
 *     gate,
 *  2. assisted listing — Ouiboo builds the first listings WITH the
 *     agency, and the agency approves before anything publishes,
 *  3. the support-relief split — Ouiboo answers platform/booking
 *     questions in FR/AR/EN at the published hours, the agency answers
 *     trip logistics, and during an active trip the agency emergency
 *     contact is the traveller's first call.
 */
export function BetaOfferCard() {
  const { t } = useTranslation();
  const hours = BETA_AGENCY_OFFER.verificationSlaWorkingHours;

  const items = [
    {
      icon: Clock3,
      title: t('betaOffer.verificationTitle', { hours }),
      body: t('betaOffer.verificationBody', { hours }),
    },
    {
      icon: Handshake,
      title: t('betaOffer.assistedTitle'),
      body: t('betaOffer.assistedBody'),
    },
    {
      icon: MessagesSquare,
      title: t('betaOffer.supportTitle'),
      body: t('betaOffer.supportBody', { hours: BETA_AGENCY_OFFER.supportResponseHours }),
    },
  ];

  return (
    <Card className="border border-border shadow-sm bg-card" data-testid="beta-offer-card">
      <CardContent className="p-6 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {t('betaOffer.title')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2">
              <item.icon className="h-5 w-5 text-sunset-orange" aria-hidden="true" />
              <p className="text-sm font-bold text-foreground">{item.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
