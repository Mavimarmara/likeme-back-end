// Config para rodar apenas testes que usam banco (requer DATABASE_URL de teste)
// Uso: npm run test:integration
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/*.integration.test.ts',
    '**/authController.test.ts',
    '**/productService.test.ts',
    '**/adService.test.ts',
    '**/orderService.*.test.ts',
    '**/activityController.test.ts',
    '**/activityService.test.ts',
    '**/anamnesisService.test.ts',
    '**/tipController.test.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.env.js'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          baseUrl: '.',
          paths: {
            '@/*': ['src/*'],
          },
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
