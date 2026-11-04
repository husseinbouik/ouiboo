'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    SUPPORT_EMAIL,
    SUPPORT_PHONE,
    isSupportEmailConfigured,
    isSupportPhoneConfigured,
    supportMailto,
    supportWhatsAppHref,
} from '@/lib/support';

/**
 * #627 (Council S4): the Law 31-08 platform identity block — who
 * Ouiboo is, on the durable traveller surfaces (booking view,
 * checkout confirmation, support / help / terms pages):
 * - the platform name (Ouiboo);
 * - the technology-platform line: trips are organised and sold by
 *   the named agency, never by Ouiboo, and Ouiboo never holds
 *   traveller money;
 * - the support email and the WhatsApp escalation number, rendered
 *   ONLY when configured (the Session #3 rule: a channel that is not
 *   configured is omitted, never replaced by a dead address);
 * - the complaints path: support email + the in-app help centre.
 *   No postal complaints address is published — none exists on
 *   record yet (pending incorporation/siège, tracked on #627).
 */
export default function PlatformIdentity({ className = '' }: { className?: string }) {
    const { t } = useTranslation();
    const mailto = supportMailto();

    return (
        <section
            data-testid="platform-identity"
            className={`rounded-2xl border border-border/60 bg-muted/20 p-5 text-sm ${className}`}
            aria-label={t('platformIdentity.title')}
        >
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {t('platformIdentity.title')}
            </p>
            <p className="mt-2 text-muted-foreground">{t('platformIdentity.technology')}</p>
            <div className="mt-2 space-y-1.5">
                {isSupportEmailConfigured && SUPPORT_EMAIL ? (
                    <p>
                        <a href={mailto ?? undefined} className="font-semibold text-sunset-orange hover:underline">
                            {t('platformIdentity.support', { email: SUPPORT_EMAIL })}
                        </a>
                    </p>
                ) : null}
                {isSupportPhoneConfigured && SUPPORT_PHONE && supportWhatsAppHref ? (
                    <p>
                        <a href={supportWhatsAppHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-sunset-orange hover:underline">
                            {t('platformIdentity.whatsapp', { phone: SUPPORT_PHONE })}
                        </a>
                    </p>
                ) : null}
                <p className="text-muted-foreground">
                    {isSupportEmailConfigured && SUPPORT_EMAIL
                        ? t('platformIdentity.complaints', { email: SUPPORT_EMAIL })
                        : t('platformIdentity.complaintsNoEmail')}
                </p>
            </div>
        </section>
    );
}
