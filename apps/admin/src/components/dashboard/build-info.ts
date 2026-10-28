import { isBetaBadgeEnabled, isSharingEnabled } from '@ouiboo/utils';

/**
 * #580 (Council S3 P2) + rework: build-stamped flag diagnostics.
 *
 * Why the deployed readout said "unknown·unknown" (PR #598): this helper
 * read the stamp through a dynamic `env.NEXT_PUBLIC_BUILD_SHA` lookup on
 * a passed-in object. Next.js only inlines NEXT_PUBLIC_* values for
 * LITERAL `process.env.<NAME>` member expressions in client code, so the
 * dynamic lookup always resolved to undefined in the browser — no matter
 * what next.config.ts stamped. The default path below therefore reads
 * every value literally. An explicit env map stays supported for tests.
 *
 * Stamp sources, in order: the value next.config.ts bakes in
 * (NEXT_PUBLIC_BUILD_SHA / NEXT_PUBLIC_BUILD_ENV), then Vercel's own
 * automatically-exposed system variables (NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
 * / NEXT_PUBLIC_VERCEL_ENV, present when system-env exposure is on, plus
 * their server-side VERCEL_* spellings). "unknown" is reported only when
 * none of them carried a value — never guessed.
 *
 * Server (API) flags are NOT part of this client snapshot: they come
 * from GET /admin/diagnostics/flags (see FlagDiagnostics).
 */

export type AdminBuildInfo = {
  /** Short (7-char) build SHA, or 'unknown' when the build carried no stamp. */
  buildSha: string;
  /** Full build SHA, or null when unstamped. */
  fullBuildSha: string | null;
  /** Deployment environment label (e.g. production / preview), or 'unknown'. */
  environment: string;
  sharingEnabled: boolean;
  betaBadgeEnabled: boolean;
  /** Always false: the admin client build alone cannot see API server flags. */
  serverFlagsDerivable: false;
};

function fromEnvMap(env: Record<string, string | undefined>): AdminBuildInfo {
  const rawSha = (
    env.NEXT_PUBLIC_BUILD_SHA ||
    env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    env.VERCEL_GIT_COMMIT_SHA ||
    ''
  ).trim();
  const environment = (
    env.NEXT_PUBLIC_BUILD_ENV ||
    env.NEXT_PUBLIC_VERCEL_ENV ||
    env.VERCEL_ENV ||
    ''
  ).trim();
  return {
    buildSha: rawSha ? rawSha.slice(0, 7) : 'unknown',
    fullBuildSha: rawSha || null,
    environment: environment || 'unknown',
    sharingEnabled: isSharingEnabled(env.NEXT_PUBLIC_SHARING_ENABLED),
    betaBadgeEnabled: isBetaBadgeEnabled(env.NEXT_PUBLIC_BETA_BADGE),
    serverFlagsDerivable: false,
  };
}

export function getAdminBuildInfo(
  env?: Record<string, string | undefined>,
): AdminBuildInfo {
  if (env) return fromEnvMap(env);
  // Literal reads ONLY — see the header: dynamic process.env lookups are
  // not inlined by Next.js and silently produced "unknown" when deployed.
  return fromEnvMap({
    NEXT_PUBLIC_BUILD_SHA: process.env.NEXT_PUBLIC_BUILD_SHA,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    NEXT_PUBLIC_BUILD_ENV: process.env.NEXT_PUBLIC_BUILD_ENV,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NEXT_PUBLIC_SHARING_ENABLED: process.env.NEXT_PUBLIC_SHARING_ENABLED,
    NEXT_PUBLIC_BETA_BADGE: process.env.NEXT_PUBLIC_BETA_BADGE,
  });
}
