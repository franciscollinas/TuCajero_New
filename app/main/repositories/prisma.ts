/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { app } from 'electron';
import path from 'path';

// eslint-disable-next-line no-var
declare global {
  // eslint-disable-next-line no-var
  var __tucajeroPrisma__: any | undefined;
}

// Usar require para poder importar dinámicamente según el entorno
const getPrismaClient = (): any => {
  let dbPath: string;

  if (app.isPackaged) {
    const appPath = app.getAppPath();
    const unpackedPath = appPath.replace('app.asar', 'app.asar.unpacked');
    const enginePath = path.join(
      unpackedPath,
      'dist',
      'main',
      'app',
      'main',
      'repositories',
      'generated-client',
      'query_engine-windows.dll.node',
    );

    // eslint-disable-next-line no-console
    console.log('[Prisma] Engine path (packaged):', enginePath);
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
    dbPath = path.join(app.getPath('userData'), 'tucajero.db');
  } else {
    // eslint-disable-next-line no-console
    console.log('[Prisma] Running in development mode');
    // En desarrollo, usar la base de datos en la carpeta database/
    dbPath = path.join(process.cwd(), 'database', 'tucajero.db');
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
