'use client';

import { LifeBuoy, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@ouiboo/ui';
import { NORMAL_SUPPORT_RESPONSE_HOURS } from '@ouiboo/utils';
import { SUPPORT_EMAIL, isSupportEmailConfigured, supportMailto } from '@/lib/support';

/**
 * Session #3 P0-9 (#556): the agency app had NO support surface at
 * all — no locale namespace, no help item, no contact channel — while
 * beta agencies carry refund-SLA, proof-review and emergency-contact
 * duties. This block is the minimal surface: the monitored contact
 * (when configured), the normal-lane expectation (reply within
 * {{hours}}h, the #419 split), and the agency's own active-trip
 * escalation role. Rendered on the dashboard, refunds and onboarding.
 */
export function SupportBlock() {
  const { t } = useTranslation();

  return (
    <Card className="border border-border shadow-sm bg-card">
      <CardContent className="p-6 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-sunset-orange" /> {t('support.title')}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isSupportEmailConfigured
            ? t('support.body', { hours: NORMAL_SUPPORT_RESPONSE_HOURS })
            : t('support.bodyNoEmail', { hours: NORMAL_SUPPORT_RESPONSE_HOURS })}
        </p>
        {isSupportEmailConfigured && supportMailto ? (
          <a
            href={supportMailto}
            className="inline-flex items-center gap-2 text-sm font-black text-primary hover:underline"
          >
            <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
          </a>
        ) : null}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('support.escalationRole')}
        </p>
      </CardContent>
    </Card>
  );
}
