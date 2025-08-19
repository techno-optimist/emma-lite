// jest.config.js - Jest configuration for Emma Vault System tests

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  
  // Test directories
  testMatch: [
    '<rootDir>/test/**/*.test.js',
    '<rootDir>/test/**/*.spec.js',
    '<rootDir>/test/hml-compliance.test.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Coverage thresholds (enforcing security requirements)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Higher thresholds for critical security modules
    './lib/vault-storage.js': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    },
    './lib/vault-backup.js': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    },
    './js/vault/vault-manager.js': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    }
  },
  
  // Files to include in coverage
  collectCoverageFrom: [
    'lib/**/*.js',
    'js/vault/**/*.js',
    'lib/hml-*.js',
    '!test/**',
    '!**/node_modules/**',
    '!coverage/**'
  ],
  
  // Module mapping for Chrome extension APIs
  moduleNameMapping: {
    '^chrome$': '<rootDir>/test/mocks/chrome-mock.js'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Test timeout for async operations
  testTimeout: 30000,
  
  // Verbose output for security tests
  verbose: true,
  
  // Global setup and teardown
  globalSetup: '<rootDir>/test/setup/global-setup.js',
  globalTeardown: '<rootDir>/test/setup/global-teardown.js',
  
  // Test categories
  projects: [
    {
      displayName: 'Security Tests',
      testMatch: ['<rootDir>/test/security/**/*.test.js'],
      coverageThreshold: {
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    },
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/test/unit/**/*.test.js'],
      coverageThreshold: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/test/integration/**/*.test.js'],
      testTimeout: 60000
    }
  ],
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-reports',
      filename: 'test-report.html',
      expand: true
    }],
    ['jest-junit', {
      outputDirectory: './test-reports',
      outputName: 'junit.xml'
    }]
  ]
};
