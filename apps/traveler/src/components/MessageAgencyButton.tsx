'use client';

import React from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/AuthContext';
import { cn } from '@ouiboo/ui/utils';

/**
 * #729 (Council S7-2): the traveller-side chat door. Rendered on the
 * trip page, the agency storefront, the booking view and the checkout
 * confirmation — every surface where a traveller may need the agency
 * about a trip, a booking, or a payment problem. It never creates
 * anything itself: it lands on the start screen (which reuses the
 * pair's existing conversation when one exists), and guests are routed
 * through sign-in first because conversations are authenticated and
 * traveller-initiated only.
 */
export default function MessageAgencyButton({
  agencyId,
  agencyName,
  className,
}: {
  agencyId?: string | null;
  agencyName?: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (!agencyId) return null;

  const startHref = `/messages/start?agencyId=${encodeURIComponent(agencyId)}${
    agencyName ? `&agencyName=${encodeURIComponent(agencyName)}` : ''
  }`;
  const href = user ? startHref : `/login?redirect=${encodeURIComponent(startHref)}`;

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted',
        className,
      )}
    >
      <MessageCircle className="h-4 w-4 text-sunset-orange" aria-hidden="true" />
      {t('messages.messageAgency')}
    </Link>
  );
}
