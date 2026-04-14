import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

/**
 * PrismaClient singleton.
 * Prevents exhausting DB connections during hot-reload in dev.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
