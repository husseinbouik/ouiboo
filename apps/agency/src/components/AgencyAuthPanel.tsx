'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthSideWordmark } from './AuthSideWordmark';

/**
 * Design Council Phase 4 — Agency auth A: branded split panel (the
 * admin-login model, as traveller Phase 2 did). The panel carries the
 * B2B money story — travellers pay the agency directly, Ouiboo never
 * holds money, fees only by written monthly invoice — plus what
 * verification to expect before trips can be listed.
 */
export function AgencyAuthPanel() {
  const { t } = useTranslation();
  const checks = [t('authPanel.verifyLicence'), t('authPanel.verifyPayment'), t('authPanel.verifyTrip')];
  return (
    <div className="relative z-10 flex h-full w-full flex-col justify-between p-12 text-white">
      <div className="flex justify-end">
        <AuthSideWordmark />
      </div>
      <div className="mb-12 space-y-6" data-testid="agency-auth-panel">
        <div>
          <h2 className="mb-3 text-3xl font-bold leading-tight">{t('authPanel.paidDirectlyTitle')}</h2>
          <p className="max-w-md text-base text-white/85">{t('authPanel.paidDirectlyBody')}</p>
        </div>
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-white/70">{t('authPanel.verifyTitle')}</p>
          <ul className="space-y-2">
            {checks.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm font-medium">
                <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-white/75">{t('authPanel.verifyTiming')}</p>
        </div>
      </div>
    </div>
  );
}
