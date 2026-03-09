module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Por padrão não rodamos testes que usam o banco (nada é criado no DB)
  testPathIgnorePatterns: [
    '\\.integration\\.test\\.ts$',
    'authController\\.test\\.ts$',
    'productService\\.test\\.ts$',
    'adService\\.test\\.ts$',
    'orderService\\.crud\\.test\\.ts$',
    'orderService\\.payment\\.test\\.ts$',
    'orderService\\.create\\.test\\.ts$',
    'orderService\\.validation\\.test\\.ts$',
    'orderService\\.split\\.test\\.ts$',
    'activityController\\.test\\.ts$',
    'activityService\\.test\\.ts$',
    'anamnesisService\\.test\\.ts$',
    'tipController\\.test\\.ts$',
  ],
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
