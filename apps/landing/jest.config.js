const nextJest = require('next/jest');

const createJestConfig = nextJest({
    dir: './',
});

const customJestConfig = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['@testing-library/jest-dom'],
    modulePathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
    testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
    moduleNameMapper: {
         '^@/(.*)$': '<rootDir>/src/$1',
        'react-i18next': '<rootDir>/__mocks__/react-i18next.js',
        '^@/lib/i18n$': '<rootDir>/__mocks__/i18n.js',
        '.*/lib/i18n': '<rootDir>/__mocks__/i18n.js',

    },
};

module.exports = createJestConfig(customJestConfig);
