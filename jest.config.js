module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
	testPathIgnorePatterns: ['/node_modules/', '/dist/'],
	collectCoverageFrom: ['nodes/**/*.ts', '!nodes/**/*.node.ts'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
