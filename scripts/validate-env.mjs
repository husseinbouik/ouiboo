import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
// Load .env from root
dotenv.config();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Auth
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  CORS_ORIGINS: z.string().min(1),
  
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
  REDIS_URL: z.string().url().optional(),
  ENABLE_SWAGGER: z.enum(['true', 'false']).optional(),
  
  // Storage
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
}).refine((data) => {
  if (process.env.NODE_ENV === 'production' && data.STORAGE_PROVIDER === 'local') {
    return false;
  }
  return true;
}, {
  message: "STORAGE_PROVIDER must be 's3' in production environment.",
  path: ['STORAGE_PROVIDER'],
}).refine((data) => {
  if (data.STORAGE_PROVIDER === 's3') {
    return !!(data.S3_BUCKET && data.S3_REGION && data.S3_ACCESS_KEY_ID && data.S3_SECRET_ACCESS_KEY);
  }
  return true;
}, {
  message: "S3 credentials are required when STORAGE_PROVIDER is 's3'.",
  path: ['STORAGE_PROVIDER'],
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
