import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { sonarjs },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      // SonarJS code-quality rules (warnings: surface issues without breaking CI)
      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/cognitive-complexity': ['warn', 20],
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/prefer-object-literal': 'warn',
      'sonarjs/no-nested-conditional': 'warn',
    },
  },
  // #1030 (B4 + A12): configuration is read through the typed, zod-
  // validated env module (src/config/env.ts). Direct process.env access
  // anywhere else under src/ is an error — except the grandfathered
  // files below, which still read it and are removed from this list one
  // by one as they migrate to the env module. Specs are exempt: tests
  // legitimately set env vars to exercise configuration branches.
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='process'][property.name='env']",
          message:
            'Read configuration via src/config/env.ts (#1030) instead of process.env.',
        },
      ],
    },
  },
  {
    files: [
      'src/config/**/*.ts',
      'src/**/*.spec.ts',
      // Grandfathered by #1030 — pre-existing direct process.env readers.
      'src/admin/admin-seed.service.ts',
      'src/admin/admin.controller.ts',
      'src/admin/server-flags.ts',
      'src/agency/agency-compliance.service.ts',
      'src/auth/auth.controller.ts',
      'src/auth/auth.module.ts',
      'src/auth/auth.service.ts',
      'src/auth/guards/mfa-enrollment.guard.ts',
      'src/auth/mfa.service.ts',
      'src/auth/strategies/jwt.strategy.ts',
      'src/bookings/bookings.service.ts',
      'src/common/billing-config.ts',
      'src/common/catalog-currency.util.ts',
      'src/common/feature-flags.service.ts',
      'src/common/redis.service.ts',
      'src/common/response.interceptor.ts',
      'src/common/trusted-origins.util.ts',
      'src/cron/cron.controller.ts',
      'src/currency/currency.service.ts',
      'src/custom-trips/custom-trips.util.ts',
      'src/email/email.service.ts',
      'src/health/health.controller.ts',
      'src/invoices/invoices.service.ts',
      'src/messaging/messaging.module.ts',
      'src/messaging/messaging.service.ts',
      'src/notifications/notification-jobs.service.ts',
      'src/notifications/push-sender.ts',
      'src/payment-providers/adapters/psp-adapter.registry.ts',
      'src/payments/gateway-enablement.service.ts',
      'src/payments/payments.service.ts',
      'src/payments/providers/cashplus-payment.provider.ts',
      'src/payments/providers/stripe-payment.provider.ts',
      'src/refunds/refunds.service.ts',
      'src/refunds/refunds.util.ts',
      'src/retention/retention-config.ts',
      'src/staged-payments/staged-payments.service.ts',
      'src/trips/trip-translations.util.ts',
      'src/upload/media-url.util.ts',
      'src/upload/providers/local-storage.provider.ts',
      'src/upload/providers/s3-storage.provider.ts',
      'src/upload/upload.service.ts',
      'src/websocket/websocket.gateway.ts',
      'src/websocket/websocket.module.ts',
      'src/worker-demo.ts',
      'src/worker/redis-connection.ts',
      'src/worker/worker-heartbeat.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // B2 stage-1 ratchet (#1020): no NEW explicit `any` in the payments
    // and auth subtrees. The files in the grandfather override below
    // still carry provider-payload / legacy user-shape `any`s — remove a
    // file from that list once it is typed (typed webhook payloads and
    // the auth user shape are the next stage).
    files: ['src/payments/**/*.ts', 'src/auth/**/*.ts'],
    ignores: ['src/**/*.spec.ts', 'src/**/__tests__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: [
      'src/payments/payments.service.ts',
      'src/payments/interfaces/payment-provider.interface.ts',
      'src/payments/providers/cashplus-payment.provider.ts',
      'src/auth/auth.service.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
