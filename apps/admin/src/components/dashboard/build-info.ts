import { isBetaBadgeEnabled, isSharingEnabled } from '@ouiboo/utils';

/**
 * #580 (Council S3 P2): build-stamped flag diagnostics for the admin shell.
 *
 * Client-visible flags only: this build can state the flags it was built
 * with (sharing, beta badge) and the build stamp baked in by
 * next.config.ts (NEXT_PUBLIC_BUILD_SHA / NEXT_PUBLIC_BUILD_ENV, sourced
 * from the Vercel git environment at build time). Server-side API flags
 * (FEATURE_* in the API's FeatureFlagsService) are NOT visible to a static
 * client build and are reported as such — never guessed.
 */

export type AdminBuildInfo = {
  /** Short (7-char) build SHA, or 'unknown' when the build carried no stamp. */
  buildSha: string;
  /** Deployment environment label (e.g. production / preview), or 'unknown'. */
  environment: string;
  sharingEnabled: boolean;
  betaBadgeEnabled: boolean;
  /** Always false: the admin client cannot see API server flags. */
  serverFlagsDerivable: false;
};

export function getAdminBuildInfo(
  env: Record<string, string | undefined> = process.env,
): AdminBuildInfo {
  const rawSha = (env.NEXT_PUBLIC_BUILD_SHA || '').trim();
  return {
    buildSha: rawSha ? rawSha.slice(0, 7) : 'unknown',
    environment: (env.NEXT_PUBLIC_BUILD_ENV || '').trim() || 'unknown',
    sharingEnabled: isSharingEnabled(env.NEXT_PUBLIC_SHARING_ENABLED),
    betaBadgeEnabled: isBetaBadgeEnabled(env.NEXT_PUBLIC_BETA_BADGE),
    serverFlagsDerivable: false,
  };
}
