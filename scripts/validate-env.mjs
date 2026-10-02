import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
// Load .env from root
dotenv.config();
const productionValidation = process.env.NODE_ENV === 'production'
  || process.argv.includes('--production');

const optionalValue = (schema) =>
  z.preprocess((value) => value === '' ? undefined : value, schema.optional());

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Auth
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  CORS_ORIGINS: z.string().min(1),
  TRUST_PROXY_HOPS: optionalValue(z.coerce.number().int().min(1).max(5)),
  
  // Email (SMTP)
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform((v) => parseInt(v, 10)),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  
  // App URLs
  API_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  TRAVELER_APP_URL: z.string().url().optional(),
  AGENCY_APP_URL: z.string().url().optional(),
  ADMIN_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_TRAVELER_URL: z.string().url().optional(),
  NEXT_PUBLIC_AGENCY_URL: z.string().url().optional(),
  NEXT_PUBLIC_LANDING_URL: z.string().url().optional(),
  NEXT_PUBLIC_MEDIA_URL: z.string().url().optional(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: optionalValue(z.string().regex(/^G-[A-Z0-9]+$/)),
  NEXT_PUBLIC_CLARITY_PROJECT_ID: optionalValue(z.string().regex(/^[a-z0-9]+$/i)),
  REDIS_URL: z.string().url().optional(),
  ENABLE_SWAGGER: z.enum(['true', 'false']).optional(),
  LOG_EMAIL_BODIES: z.enum(['true', 'false']).optional(),
  ENABLE_GATEWAY_PAYMENTS: z.enum(['true', 'false']).default('false'),
  ADMIN_SEED: z.enum(['true', 'false']).default('false'),
  ADMIN_EMAIL: optionalValue(z.string().email()),
  ADMIN_USERNAME: optionalValue(z.string().min(1)),
  ADMIN_PASSWORD: optionalValue(z.string().min(1)),
  ADMIN_SEED_ROTATE: z.enum(['true', 'false']).optional(),
  WORKER_HEARTBEAT_INTERVAL_MS: optionalValue(z.coerce.number().int().positive()),
  WORKER_HEARTBEAT_MAX_AGE_MS: optionalValue(z.coerce.number().int().positive()),

  // Landing waitlist
  GMAIL_EMAIL: optionalValue(z.string().email()),
  GMAIL_APP_PASSWORD: optionalValue(z.string().min(1)),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: optionalValue(z.string().email()),
  GOOGLE_PRIVATE_KEY: optionalValue(z.string().min(1)),
  GOOGLE_SHEET_ID: optionalValue(z.string().min(1)),
  
  // Storage
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_PUBLIC_URL: z.string().url().optional(),
}).refine((data) => {
  if (productionValidation && data.STORAGE_PROVIDER === 'local') {
    return false;
  }
  return true;
}, {
  message: "STORAGE_PROVIDER must be 's3' in production environment.",
  path: ['STORAGE_PROVIDER'],
}).refine((data) => {
  if (data.STORAGE_PROVIDER === 's3') {
    return !!(data.S3_BUCKET && data.S3_REGION && data.S3_ACCESS_KEY_ID && data.S3_SECRET_ACCESS_KEY && data.S3_PUBLIC_URL);
  }
  return true;
}, {
  message: "S3 credentials and S3_PUBLIC_URL are required when STORAGE_PROVIDER is 's3'.",
  path: ['STORAGE_PROVIDER'],
}).superRefine((data, ctx) => {
  const heartbeatInterval = data.WORKER_HEARTBEAT_INTERVAL_MS ?? 15_000;
  const heartbeatMaxAge = data.WORKER_HEARTBEAT_MAX_AGE_MS ?? 45_000;
  if (heartbeatMaxAge <= heartbeatInterval * 2) {
    ctx.addIssue({
      code: 'custom',
      path: ['WORKER_HEARTBEAT_MAX_AGE_MS'],
      message: 'WORKER_HEARTBEAT_MAX_AGE_MS must be more than twice WORKER_HEARTBEAT_INTERVAL_MS.',
    });
  }

  if (!productionValidation) return;

  const secretPlaceholderPattern = /(?:demo|change|replace|secret|password)/i;
  for (const name of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const secret = data[name];
    if (secret.length < 32 || secretPlaceholderPattern.test(secret)) {
      ctx.addIssue({
        code: 'custom',
        path: [name],
        message: `${name} must be at least 32 characters and must not contain placeholder text in production.`,
      });
    }
  }
  if (data.JWT_SECRET === data.JWT_REFRESH_SECRET) {
    ctx.addIssue({
      code: 'custom',
      path: ['JWT_REFRESH_SECRET'],
      message: 'JWT_REFRESH_SECRET must be different from JWT_SECRET in production.',
    });
  }

  if (data.S3_PUBLIC_URL && data.NEXT_PUBLIC_MEDIA_URL) {
    const storageUrl = data.S3_PUBLIC_URL.replace(/\/$/, '');
    const frontendUrl = data.NEXT_PUBLIC_MEDIA_URL.replace(/\/$/, '');
    if (storageUrl !== frontendUrl) {
      ctx.addIssue({
        code: 'custom',
        path: ['NEXT_PUBLIC_MEDIA_URL'],
        message: 'NEXT_PUBLIC_MEDIA_URL must match S3_PUBLIC_URL so optimized uploads remain loadable.',
      });
    }
    if (!storageUrl.startsWith('https://')) {
      ctx.addIssue({
        code: 'custom',
        path: ['S3_PUBLIC_URL'],
        message: 'The production public media URL must use HTTPS.',
      });
    }
  }

  for (const origin of data.CORS_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean)) {
    try {
      const url = new URL(origin);
      if (url.protocol !== 'https:' || url.origin !== origin.replace(/\/$/, '')) {
        throw new Error('invalid production origin');
      }
    } catch {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGINS'],
        message: `CORS origin '${origin}' must be an HTTPS origin without a path in production.`,
      });
    }
  }

  if (data.ADMIN_SEED === 'true') {
    if (!data.ADMIN_EMAIL) {
      ctx.addIssue({
        code: 'custom',
        path: ['ADMIN_EMAIL'],
        message: 'ADMIN_EMAIL is required when ADMIN_SEED=true in production.',
      });
    }

    const weakPasswords = new Set(['admin', 'password', 'change-me', 'replace-me']);
    if (!data.ADMIN_PASSWORD || data.ADMIN_PASSWORD.length < 15 || weakPasswords.has(data.ADMIN_PASSWORD.toLowerCase())) {
      ctx.addIssue({
        code: 'custom',
        path: ['ADMIN_PASSWORD'],
        message: 'ADMIN_PASSWORD must be at least 15 characters and not a known placeholder when ADMIN_SEED=true in production.',
      });
    }
  }

  const productionRequired = [
    'API_URL',
    'NEXT_PUBLIC_API_URL',
    'TRAVELER_APP_URL',
    'AGENCY_APP_URL',
    'ADMIN_APP_URL',
    'NEXT_PUBLIC_TRAVELER_URL',
    'NEXT_PUBLIC_AGENCY_URL',
    'NEXT_PUBLIC_LANDING_URL',
    'NEXT_PUBLIC_MEDIA_URL',
    'S3_PUBLIC_URL',
    'REDIS_URL',
    'TRUST_PROXY_HOPS',
    'GMAIL_EMAIL',
    'GMAIL_APP_PASSWORD',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_SHEET_ID',
  ];

  for (const name of productionRequired) {
    if (!data[name]) {
      ctx.addIssue({
        code: 'custom',
        path: [name],
        message: `${name} is required in production.`,
      });
    }
  }
});

export function validateEnv() {
  console.log('🔍 Validating environment variables...');
  
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    });
    return false;
  }
  
  console.log('✅ Environment variables are valid.');
  return true;
}

if (process.argv[1] === __filename) {
  if (!validateEnv()) {
    process.exit(1);
  }
}
