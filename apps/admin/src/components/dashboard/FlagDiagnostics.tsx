'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { getAdminBuildInfo } from './build-info';
import type { AdminServerFlags } from './types';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

/**
 * #580 + rework: build-stamped flag readout on the admin shell. Answers
 * "broken or gated?" at a glance: the build SHA / environment this admin
 * build was stamped with (literal env reads — see build-info.ts for why
 * the PR #598 version always showed "unknown" when deployed), the client
 * flags it was built with, and — new in the rework — the API's effective
 * server flags from GET /admin/diagnostics/flags. Fail-closed: while the
 * endpoint loads we say so, and if it errors we say it is unavailable —
 * server values are never guessed from the client build.
 */
export default function FlagDiagnostics({ t }: { t: TFn }) {
  const info = getAdminBuildInfo();
  const onOff = (value: boolean) => (value ? t('dashboard.diagnostics.on') : t('dashboard.diagnostics.off'));

  const serverFlagsQuery = useQuery<AdminServerFlags>({
    queryKey: ['admin-diagnostics-flags'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/diagnostics/flags');
      return response.data;
    },
    staleTime: 60_000,
    retry: false,
  });
  // Defensive (same pattern as BetaMetricsPanel): a malformed payload is
  // shown as unavailable, never rendered as partial flags or a crash.
  const rawServerFlags = serverFlagsQuery.data;
  const serverFlags =
    rawServerFlags && rawServerFlags.flags && Array.isArray(rawServerFlags.featureFlags)
      ? rawServerFlags
      : null;
  const serverFlagsMalformed = Boolean(rawServerFlags && !serverFlags);

  return (
    <div data-testid="flag-diagnostics" className="text-[11px] leading-relaxed text-white/50 space-y-1 px-2">
      <p className="font-bold uppercase tracking-widest text-white/60">{t('dashboard.diagnostics.title')}</p>
      <p>
        {t('dashboard.diagnostics.build')}:{' '}
        <span className="font-mono text-white/80" title={info.fullBuildSha ?? undefined}>{info.buildSha}</span>
        {' · '}
        {info.environment}
      </p>
      <p>
        {t('dashboard.diagnostics.sharing')}: {onOff(info.sharingEnabled)}
        {' · '}
        {t('dashboard.diagnostics.betaBadge')}: {onOff(info.betaBadgeEnabled)}
      </p>
      <div data-testid="flag-diagnostics-server">
        <p className="font-bold uppercase tracking-widest text-white/60">{t('dashboard.diagnostics.serverFlags')}</p>
        {serverFlagsQuery.isLoading && <p>{t('dashboard.diagnostics.serverFlagsLoading')}</p>}
        {(serverFlagsQuery.isError || serverFlagsMalformed) && <p>{t('dashboard.diagnostics.serverFlagsUnavailable')}</p>}
        {serverFlags && (
          <>
            <p>
              {t('dashboard.diagnostics.serverEnv')}: <span className="text-white/80">{serverFlags.environment}</span>
            </p>
            <p>
              {t('dashboard.diagnostics.madOnlyCatalog')}: {onOff(serverFlags.flags.madOnlyCatalog)}
              {' · '}
              {t('dashboard.diagnostics.adminMfaRequired')}: {onOff(serverFlags.flags.adminMfaRequired)}
            </p>
            {serverFlags.featureFlags.length > 0 ? (
              serverFlags.featureFlags.map((flag) => (
                <p key={flag.name} className="font-mono">
                  FEATURE_{flag.name}: {onOff(flag.enabled)}
                </p>
              ))
            ) : (
              <p>{t('dashboard.diagnostics.noFeatureFlags')}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
