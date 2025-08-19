// Minimal Jest config for HML tests (CommonJS to avoid ESM config issues)
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testMatch: ['<rootDir>/test/**/*.test.js'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  collectCoverageFrom: [
    'lib/hml-*.js'
  ],
  verbose: false
};

