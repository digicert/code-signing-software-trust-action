/** @type {import('jest').Config} */
module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Use Node.js environment (not browser)
  testEnvironment: 'node',
  
  // Test file locations
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts', // Entry point, tested via integration
  ],
  
  // Coverage thresholds (can adjust these as you improve coverage)
  coverageThreshold: {
    global: {
      branches: 50,    // Start with 50%, increase to 70% over time
      functions: 60,   // Start with 60%, increase to 80% over time
      lines: 60,       // Start with 60%, increase to 80% over time
      statements: 60,  // Start with 60%, increase to 80% over time
    },
  },
  
  // Coverage output directory
  coverageDirectory: 'coverage',
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Module name mapper for absolute imports (if needed)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      isolatedModules: true,  // Disable type checking
      diagnostics: false,     // Disable TypeScript diagnostics
    }],
  },
  
  // Setup files to run before tests
  // setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/lib/',
    '/build/',
  ],
  
  // Global timeout for tests (30 seconds)
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
};
