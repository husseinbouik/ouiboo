const nextJest = require('next/jest');

const createJestConfig = nextJest({
    dir: './',
});

const customJestConfig = {
    testEnvironment: 'jsdom',
    setupFilesAfterFramework: ['@testing-library/jest-dom'], 
    moduleNameMapper: {
         '^@/(.*)$': '<rootDir>/src/$1',
        'react-i18next': '<rootDir>/__mocks__/react-i18next.js',
        '^@/lib/i18n$': '<rootDir>/__mocks__/i18n.js',
        '.*/lib/i18n': '<rootDir>/__mocks__/i18n.js',

    },
};

module.exports = createJestConfig(customJestConfig);
