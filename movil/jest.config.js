module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  // Sonar cuenta las pruebas como código: se miden igual que en el backend (RNF-90).
  forceCoverageMatch: ['**/*.test.ts', '**/*.test.tsx'],
  coverageReporters: ['text-summary', 'lcov'],
  moduleNameMapper: {
    '^react-native/setup-env$': '<rootDir>/jest/setup-env.js',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@noble))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
};
