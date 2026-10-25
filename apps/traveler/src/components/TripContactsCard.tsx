'use client';

import Link from 'next/link';
import { LifeBuoy, Mail, Phone } from 'lucide-react';
import { Card } from '@ouiboo/ui';
import type { BookingDetails } from '@ouiboo/types';
import { isTripActiveWindow, NORMAL_SUPPORT_RESPONSE_HOURS, shouldShowTripContacts } from '@ouiboo/utils';
import { useTranslation } from 'react-i18next';
import '../lib/i18n';
import { SUPPORT_EMAIL, supportMailto } from '@/lib/support';

/**
 * #419 (Council P0-16): the departure pack. On a booking, the traveller
 * sees — in this order —
 *  1. the AGENCY's emergency contact (first call during an active
 *     trip), with an honest fallback when the agency has not published
 *     one, and
 *  2. the OuiBoo escalation route, honestly scoped to the active trip
 *     period (not a 24/7 hotline promise),
 * plus the normal support lane (email, reply within 48 hours) for
 * everything else.
 */
export function TripContactsCard({ booking }: { booking: BookingDetails }) {
    const { t } = useTranslation();

    if (!shouldShowTripContacts(booking.status)) {
        return null;
    }

    const agency = booking.session.template.agency;
    const emergencyPhone = agency.emergencyContactPhone?.trim();
    const emergencyName = agency.emergencyContactName?.trim();
    const tripActive = isTripActiveWindow(booking.session.startDate, booking.session.endDate);
    const telHref = emergencyPhone ? `tel:${emergencyPhone.replace(/[\s().-]/g, '')}` : null;

    return (
        <Card className="rounded-[2rem] border border-border shadow-sm bg-card">
            <div className="p-8 space-y-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <LifeBuoy className="h-4 w-4 text-sunset-orange" /> {t('support.contactsTitle')}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{t('support.contactsSubtitle')}</p>
                    {tripActive && (
                        <p className="mt-3 inline-flex rounded-full bg-success/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-success">
                            {t('support.tripActiveNow')}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {t('support.agencyFirstTitle')}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">{t('support.agencyFirstBody')}</p>
                        {emergencyPhone ? (
                            <div className="mt-4 space-y-1">
                                <p className="text-sm font-semibold text-foreground">
                                    {emergencyName || agency.companyName}
                                </p>
                                <a
                                    href={telHref ?? undefined}
                                    className="inline-flex items-center gap-2 text-sm font-black text-sunset-orange hover:text-orange-600"
                                >
                                    <Phone className="h-4 w-4" /> {emergencyPhone}
                                </a>
                            </div>
                        ) : (
                            <p className="mt-4 text-sm font-semibold text-foreground">
                                {t('support.noAgencyContact')}
                            </p>
                        )}
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {t('support.escalationTitle')}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">{t('support.escalationBody')}</p>
                        <a
                            href={supportMailto('Trip emergency — escalation')}
                            className="mt-4 inline-flex items-center gap-2 text-sm font-black text-sunset-orange hover:text-orange-600"
                        >
                            <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
                        </a>
                    </div>
                </div>

                <p className="text-sm text-muted-foreground">
                    {t('support.normalLine', { hours: NORMAL_SUPPORT_RESPONSE_HOURS })}{' '}
                    <Link href="/support" className="font-semibold text-sunset-orange hover:text-orange-600">
                        {t('support.fullSupportPage')}
                    </Link>
                </p>
            </div>
        </Card>
    );
}
