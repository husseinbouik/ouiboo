import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import sonarjs from 'eslint-plugin-sonarjs';

export default defineConfig([
    ...nextVitals,
    ...nextTs,
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
        files: ['*.config.{js,cjs,mjs,ts}', 'jest.config.js', 'jest.config.cjs'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    globalIgnores([
        '.next/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
    ]),
]);
