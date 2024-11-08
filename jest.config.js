module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.test.ts'],
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts', 'run'],
    coverageReporters: ['json'],
    coveragePathIgnorePatterns: ['src/commands/test.ts'],
    setupFiles: ['<rootDir>/jest.setup.js'],
  };