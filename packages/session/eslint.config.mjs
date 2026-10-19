import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { sonarjs },
    rules: {
      // SonarJS code-quality rules (warnings: surface issues without breaking CI)
      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/cognitive-complexity': ['warn', 20],
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/prefer-object-literal': 'warn',
      'sonarjs/no-nested-conditional': 'warn',
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**'],
  }
);
