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
