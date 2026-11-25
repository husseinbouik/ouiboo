import { z } from 'zod'

/**
 * #1030 (B4 + A12): the API's single typed, validated environment module.
 *
 * Before this module, the API read `process.env` ad hoc at ~324 sites
 * (87 distinct variables): a typo'd name failed silently as `undefined`,
 * optional vars were read with inconsistent defaults, and the only
 * validation was `validateRequiredEnv()`'s production-only check of 10
 * names in create-app.ts. A full zod schema already existed — but only
 * in the offline `scripts/validate-env.mjs` pre-flight, which no running
 * process ever imported.
 *
 * This module promotes that schema into the boot path:
 * - `env` is parsed ONCE at import; `createApp()` imports it first, so a
 *   misconfigured production boot fails fast with a readable message.
 * - Production rules mirror (and extend) the old `validateRequiredEnv`:
 *   the same 10 required variables, plus the JWT length / placeholder /
 *   distinctness rules. Outside production the required set is NOT
 *   enforced, so dev and test boots keep working with partial env —
 *   exactly the old semantics.
 * - New code must read configuration from here. Direct `process.env`
 *   access outside this module is banned by ESLint
 *   (`no-restricted-syntax` in eslint.config.mjs); files that still read
 *   it are grandfathered there explicitly and shrink as they migrate.
 */

const optionalString = z.string().optional()

const optionalFlag = z.enum(['true', 'false']).optional()

// Optional numeric setting: unset/empty means "use the caller's
// default"; a non-numeric value also falls back rather than crashing
// the boot for an advisory knob. Strictness lives on the
// production-required set below, not on advisory numbers.
const optionalNumber = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined || value.trim() === '') return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  })

const REQUIRED_IN_PRODUCTION = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CORS_ORIGINS',
  'DATABASE_URL',
  'REDIS_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'TRUST_PROXY_HOPS',
] as const

const SECRET_PLACEHOLDER_PATTERN = /(?:demo|change|replace|secret|password)/i

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z
      .string()
      .optional()
      .transform((value) => {
        const parsed = value ? Number(value) : NaN
        return Number.isInteger(parsed) && parsed > 0 ? parsed : 3000
      }),

    // Required in production (enforced by the superRefine below).
    DATABASE_URL: optionalString,
    JWT_SECRET: optionalString,
    JWT_REFRESH_SECRET: optionalString,
    CORS_ORIGINS: optionalString,
    REDIS_URL: optionalString,
    SMTP_HOST: optionalString,
    SMTP_PORT: optionalString,
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    TRUST_PROXY_HOPS: optionalString,

    // App origins / public URLs.
    API_URL: optionalString,
    API_PUBLIC_URL: optionalString,
    APP_BASE_URL: optionalString,
    FRONTEND_URL: optionalString,
    TRAVELER_APP_URL: optionalString,
    AGENCY_APP_URL: optionalString,
    ADMIN_APP_URL: optionalString,

    // Feature flags and platform toggles.
    ENABLE_GATEWAY_PAYMENTS: optionalFlag,
    ENABLE_SWAGGER: optionalFlag,
    MAD_ONLY_CATALOG: optionalFlag,
    ADMIN_SEED: optionalFlag,
    ADMIN_SEED_ROTATE: optionalFlag,
    ADMIN_MFA_REQUIRED: optionalFlag,
    API_ENVELOPE_MODE: optionalString,
    LOG_EMAIL_BODIES: optionalFlag,

    // Admin seed / alerts.
    ADMIN_EMAIL: optionalString,
    ADMIN_USERNAME: optionalString,
    ADMIN_PASSWORD: optionalString,
    ADMIN_ALERT_EMAIL: optionalString,
    ALERT_WEBHOOK_URL: optionalString,

    // Security secrets.
    MFA_ENCRYPTION_KEY: optionalString,
    CRON_SECRET: optionalString,
    UNSUBSCRIBE_SECRET: optionalString,

    // Payments / PSPs.
    STRIPE_SECRET_KEY: optionalString,
    STRIPE_PUBLISHABLE_KEY: optionalString,
    STRIPE_WEBHOOK_SECRET: optionalString,
    STRIPE_CALLBACK_URL: optionalString,
    CASHPLUS_API_KEY: optionalString,
    CASHPLUS_MERCHANT_ID: optionalString,
    CASHPLUS_BASE_URL: optionalString,
    CASHPLUS_CALLBACK_URL: optionalString,
    PSP_SANDBOX_WEBHOOK_SECRET: optionalString,
    EXCHANGE_RATE_API_URL: optionalString,
    PAYMENT_PROOF_EXPIRATION_HOURS: optionalNumber,

    // Messaging (SMS / WhatsApp).
    MESSAGING_ENABLED: optionalFlag,
    SMS_ENABLED: optionalFlag,
    WHATSAPP_ENABLED: optionalFlag,
    MESSAGING_ACCOUNT_SID: optionalString,
    MESSAGING_AUTH_TOKEN: optionalString,
    MESSAGING_SMS_FROM: optionalString,
    MESSAGING_WHATSAPP_FROM: optionalString,
    MESSAGING_WEBHOOK_SECRET: optionalString,

    // Push (Web Push / VAPID).
    VAPID_PUBLIC_KEY: optionalString,
    VAPID_PRIVATE_KEY: optionalString,
    VAPID_SUBJECT: optionalString,

    // Storage.
    STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
    S3_BUCKET: optionalString,
    S3_REGION: optionalString,
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_ENDPOINT: optionalString,
    S3_PUBLIC_URL: optionalString,

    // Business configuration.
    OUIBOO_LEGAL_NAME: optionalString,
    OUIBOO_LEGAL_ICE: optionalString,
    OUIBOO_LEGAL_IF: optionalString,
    OUIBOO_POSTAL_ADDRESS: optionalString,
    SUPPORT_EMAIL: optionalString,
    SUPPORT_PHONE: optionalString,
    OUIBOO_COMMISSION_RATE_PERCENT: optionalNumber,
    OUIBOO_SUBSCRIPTION_PRICE_HT_MAD: optionalNumber,
    OUIBOO_VAT_RATE_PERCENT: optionalNumber,
    REFUND_AGENCY_ACTION_DAYS: optionalNumber,
    AUDIT_LOG_RETENTION_DAYS: optionalNumber,
    TRIP_CONTENT_CANONICAL_LOCALE: optionalString,
    CUSTOM_REF: optionalString,

    // Worker / platform runtime.
    WORKER_HEARTBEAT_INTERVAL_MS: optionalNumber,
    WORKER_HEARTBEAT_MAX_AGE_MS: optionalNumber,
    DEMO_WORKER_HEARTBEAT_MS: optionalNumber,
    WORKER_HEALTH_FILE: optionalString,
    VERCEL: optionalString,
    AWS_LAMBDA_FUNCTION_NAME: optionalString,
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') return

    for (const name of REQUIRED_IN_PRODUCTION) {
      if (!data[name]) {
        ctx.addIssue({
          code: 'custom',
          path: [name],
          message: `${name} is required in production`,
        })
      }
    }

    const jwtSecret = data.JWT_SECRET ?? ''
    const refreshSecret = data.JWT_REFRESH_SECRET ?? ''
    if (
      jwtSecret &&
      (jwtSecret.length < 32 || SECRET_PLACEHOLDER_PATTERN.test(jwtSecret))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message:
          'JWT_SECRET must be at least 32 characters and a non-placeholder value in production',
      })
    }
    if (
      refreshSecret &&
      (refreshSecret.length < 32 || SECRET_PLACEHOLDER_PATTERN.test(refreshSecret))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message:
          'JWT_REFRESH_SECRET must be at least 32 characters and a non-placeholder value in production',
      })
    }
    if (jwtSecret && refreshSecret && jwtSecret === refreshSecret) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_SECRET and JWT_REFRESH_SECRET must be different in production',
      })
    }
  })

export type Env = z.infer<typeof envSchema>

export const parseEnv = (source: NodeJS.ProcessEnv = process.env): Env => {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid environment configuration: ${details}`)
  }
  return result.data
}

/** The process environment, parsed and validated once at boot. */
export const env: Env = parseEnv()
