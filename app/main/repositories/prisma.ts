/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { app } from 'electron';

import { getDatabasePath, getPrismaEnginePath } from '../utils/paths';

// eslint-disable-next-line no-var
declare global {
  // eslint-disable-next-line no-var
  var __tucajeroPrisma__: any | undefined;
}

const getPrismaClient = (): any => {
  const dbPath = getDatabasePath();

  if (app.isPackaged) {
    const enginePath = getPrismaEnginePath();
    // eslint-disable-next-line no-console
    console.log('[Prisma] Engine path (packaged):', enginePath);
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
  } else {
    // eslint-disable-next-line no-console
    console.log('[Prisma] Running in development mode');
  }

  // eslint-disable-next-line no-console
  console.log('[Prisma] Database path:', dbPath);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('./generated-client');
  return new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
  });
};

export const prisma: any = globalThis.__tucajeroPrisma__ ?? getPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__tucajeroPrisma__ = prisma;
}
