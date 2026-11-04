'use client';

import Link from 'next/link';
import { LifeBuoy, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Card } from '@ouiboo/ui';
import type { BookingDetails } from '@ouiboo/types';
import { isTripActiveWindow, NORMAL_SUPPORT_RESPONSE_HOURS, shouldShowTripContacts } from '@ouiboo/utils';
import { useTranslation } from 'react-i18next';
import '../lib/i18n';
import {
    SUPPORT_EMAIL,
    SUPPORT_PHONE,
    agencyWhatsAppHref,
    supportMailto,
    supportTelHref,
    supportWhatsAppHref,
} from '@/lib/support';

/**
 * #419 (Council P0-16) departure pack, extended by Council S6 #679/#680
 * into the booking's EMERGENCY CARD. On a booking, the traveller sees —
 * in this order —
 *  1. the AGENCY's emergency contact (first call during an active
 *     trip), with an honest fallback when the agency has not published
 *     one, plus a WhatsApp deep link to the agency's number on record
 *     and the in-app messaging alternative (#679 — links only: the chat
 *     happens in WhatsApp, never inside OuiBoo, and WhatsApp is never
 *     a mandatory field),
 *  2. the trip's structured MEETING POINT (#676/#680 — the booking
 *     view is the authorised surface for the exact address + maps
 *     link), and
 *  3. the OuiBoo escalation route, honestly scoped to the active trip
 *     period (not a 24/7 hotline promise), with its WhatsApp deep link
 *     shown during the trip window (#679),
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
    const agencyWhatsApp = agencyWhatsAppHref(emergencyPhone, t('support.agencyWhatsAppGreeting'));
    const meetingPoint = booking.session.template.meetingPoint;

    return (
        <Card className="rounded-3xl border border-border shadow-sm bg-card" data-testid="emergency-card">
            <div className="p-8 space-y-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <LifeBuoy className="h-4 w-4 text-sunset-orange" /> {t('support.emergencyCardTitle')}
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
                                {/* #679: traveller → agency WhatsApp deep
                                    link from the agency's number on
                                    record (prefilled neutral greeting).
                                    Offered alongside — never instead of —
                                    in-app messaging. */}
                                <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                                    {agencyWhatsApp ? (
                                        <a
                                            href={agencyWhatsApp}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-sm font-black text-sunset-orange hover:text-orange-600"
                                        >
                                            <MessageCircle className="h-4 w-4" /> {t('support.agencyWhatsApp')}
                                        </a>
                                    ) : null}
                                    <Link
                                        href="/messages"
                                        className="inline-flex items-center gap-2 text-sm font-black text-sunset-orange hover:text-orange-600"
                                    >
                                        <Mail className="h-4 w-4" /> {t('support.messageAgencyInApp')}
                                    </Link>
                                </div>
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
                        {/* Session #3 P0-8 (#419): a telephonic escalation
                            channel — the founder number (call / WhatsApp)
                            renders only when NEXT_PUBLIC_SUPPORT_PHONE is
                            configured; the number itself is founder-provided
                            (BETA_OPS_CHECKLIST §4), never hardcoded. #679:
                            the WhatsApp deep link is a trip-window channel
                            and renders while the trip is active. */}
                        {SUPPORT_PHONE && supportTelHref ? (
                            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                                <a
                                    href={supportTelHref}
                                    className="inline-flex items-center gap-2 text-sm font-black text-sunset-orange hover:text-orange-600"
                                >
                                    <Phone className="h-4 w-4" /> {t('support.escalationCall')} · {SUPPORT_PHONE}
                                </a>
                                {supportWhatsAppHref && tripActive ? (
                                    <a
                                        href={supportWhatsAppHref}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-black text-sunset-orange hover:text-orange-600"
                                    >
                                        <MessageCircle className="h-4 w-4" /> {t('support.escalationWhatsApp')}
                                    </a>
                                ) : null}
                            </div>
                        ) : null}
                        {SUPPORT_PHONE && !tripActive ? (
                            <p className="mt-3 text-xs text-muted-foreground">
                                {t('support.escalationWhatsAppDuringTrip')}
                            </p>
                        ) : null}
                        {/* Session #3 P0-7a (#555): the escalation mailto
                            renders only when a monitored inbox is
                            configured — never a dead default address. */}
                        {SUPPORT_EMAIL && supportMailto('Trip emergency — escalation') ? (
                            <a
                                href={supportMailto('Trip emergency — escalation') ?? undefined}
                                className="mt-4 inline-flex items-center gap-2 text-sm font-black text-sunset-orange hover:text-orange-600"
                            >
                                <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
                            </a>
                        ) : null}
                    </div>
                </div>

                {/* #680: the meeting point rides on the Emergency Card —
                    exact address + maps link (the booking view is the
                    authorised surface; public trip pages show the area
                    only), under the agency contact and above the normal
                    support lane. */}
                {meetingPoint && (
                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-5" data-testid="emergency-meeting-point">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {t('bookingDetail.meetingPoint')}
                        </p>
                        <div className="mt-3 space-y-2 text-sm">
                            {meetingPoint.address && (
                                <p className="font-semibold text-foreground">{meetingPoint.address}</p>
                            )}
                            {meetingPoint.pickupAvailable && (
                                <p className="text-muted-foreground">{t('bookingDetail.meetingPickup')}</p>
                            )}
                            {meetingPoint.mapsUrl && (
                                <a
                                    href={meetingPoint.mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 font-semibold text-sunset-orange hover:underline"
                                >
                                    <MapPin className="h-4 w-4" /> {t('bookingDetail.viewOnMap')}
                                </a>
                            )}
                        </div>
                    </div>
                )}

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
