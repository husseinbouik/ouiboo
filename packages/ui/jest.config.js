/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  rootDir: '.',
  testRegex: '.*\\.test\\.tsx$',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          strict: true,
          target: 'ES2022',
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          skipLibCheck: true,
          jsx: 'react-jsx',
        },
      },
    ],
  },
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // Workspace sources (their package "main" fields point at build
    // output for @ouiboo/types); test against the TypeScript sources.
    '^@ouiboo/utils$': '<rootDir>/../utils/index.ts',
    '^@ouiboo/types$': '<rootDir>/../types/index.ts',
  },
};
