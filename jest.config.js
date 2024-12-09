module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'js', 'tsx', 'jsx', 'json', 'node'],
    testMatch: ['**/__test__/**/*.test.ts', '**/*.test.ts'],
    moduleNameMapper: {
        '^\\$amplify/()$': '<rootDir>/.amplify/generated/$1',
    },
}