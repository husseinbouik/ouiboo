'use client';

import React from 'react';
import { getAdminBuildInfo } from './build-info';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

/**
 * #580: build-stamped flag readout on the admin shell. Answers "broken or
 * gated?" at a glance: the build SHA / environment this admin build was
 * stamped with, plus the client flags it was built with. Server (API)
 * flags are explicitly marked not visible from here — never guessed.
 */
export default function FlagDiagnostics({ t }: { t: TFn }) {
  const info = getAdminBuildInfo();
  const onOff = (value: boolean) => (value ? t('dashboard.diagnostics.on') : t('dashboard.diagnostics.off'));
  return (
    <div data-testid="flag-diagnostics" className="text-[11px] leading-relaxed text-white/50 space-y-1 px-2">
      <p className="font-bold uppercase tracking-widest text-white/60">{t('dashboard.diagnostics.title')}</p>
      <p>
        {t('dashboard.diagnostics.build')}: <span className="font-mono text-white/80">{info.buildSha}</span>
        {' · '}
        {info.environment}
      </p>
      <p>
        {t('dashboard.diagnostics.sharing')}: {onOff(info.sharingEnabled)}
        {' · '}
        {t('dashboard.diagnostics.betaBadge')}: {onOff(info.betaBadgeEnabled)}
      </p>
      <p>{t('dashboard.diagnostics.serverFlags')}</p>
    </div>
  );
}
