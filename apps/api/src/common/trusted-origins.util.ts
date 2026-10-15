/**
 * Trusted app origins for CSRF/Origin validation and CORS.
 *
 * In production, origins come exclusively from the validated CORS_ORIGINS
 * environment variable (required at startup — see validateRequiredEnv).
 * In development, localhost origins are added for local frontend dev servers.
 *
 * Used by:
 * - create-app.ts for CORS configuration
 * - CsrfGuard for Origin/Referer validation on cookie-based mutations
 */

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
  'http://127.0.0.1:3004',
];

export function getTrustedOrigins(): string[] {
  const configuredOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

  if (process.env.NODE_ENV === 'production') return configuredOrigins;
  return Array.from(new Set([...configuredOrigins, ...DEV_ORIGINS]));
}
