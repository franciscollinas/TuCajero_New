import { PrismaClient } from '@prisma/client';

declare global {
  var __tucajeroPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__tucajeroPrisma__ ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__tucajeroPrisma__ = prisma;
}
