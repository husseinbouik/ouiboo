import { isMadOnlyCatalogEnabled } from '../common/catalog-currency.util';
import type { FeatureFlagsService } from '../common/feature-flags.service';

/**
 * #580 rework: the API's effective server-flag snapshot for the admin
 * diagnostics readout. Every value is read from the same source the
 * runtime behaviour uses — FEATURE_* via FeatureFlagsService (loaded
 * from env at startup, fail-closed), MAD_ONLY_CATALOG via the catalogue
 * gate util, ADMIN_MFA_REQUIRED via the same env check the auth flow
 * uses — so the readout can never drift from effective behaviour.
 */
export type ServerFlagsSnapshot = {
  generatedAt: string;
  environment: string;
  featureFlags: Array<{ name: string; enabled: boolean }>;
  flags: {
    madOnlyCatalog: boolean;
    adminMfaRequired: boolean;
  };
};

export function buildServerFlagsSnapshot(
  featureFlags: Pick<FeatureFlagsService, 'getKnownFlags' | 'isEnabled'>,
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
): ServerFlagsSnapshot {
  return {
    generatedAt: now.toISOString(),
    environment: env.NODE_ENV?.trim() || 'unknown',
    featureFlags: featureFlags
      .getKnownFlags()
      .slice()
      .sort()
      .map((name) => ({ name, enabled: featureFlags.isEnabled(name) })),
    flags: {
      madOnlyCatalog: isMadOnlyCatalogEnabled(),
      adminMfaRequired: env.ADMIN_MFA_REQUIRED === 'true',
    },
  };
}
