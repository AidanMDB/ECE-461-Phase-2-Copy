module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    
    // These make it crash

    // collectCoverage: true,
    // collectCoverageFrom: ['**/functions/**/*.ts'],
    // coverageDirectory: 'coverage',
  };

  