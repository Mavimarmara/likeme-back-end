import { PrismaClient } from '@prisma/client';
import { config } from './index';

declare global {
  var __prisma: PrismaClient | undefined;
}

if (!config.databaseUrl) {
  console.warn('⚠️  DATABASE_URL não configurada. Verifique seu arquivo .env');
}

const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export default prisma;
