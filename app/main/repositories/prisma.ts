import { app } from 'electron';
import path from 'path';
import { PrismaClient } from './generated-client';

declare global {
  var __tucajeroPrisma__: PrismaClient | undefined;
}

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
    'query_engine-windows.dll.node'
  );
  
  console.log('PRISMA ENGINE PATH:', enginePath);
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
}

export const prisma: PrismaClient =
  globalThis.__tucajeroPrisma__ ??
  new PrismaClient({ log: ['error', 'warn'] });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__tucajeroPrisma__ = prisma;
}
