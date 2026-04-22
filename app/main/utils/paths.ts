import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const DATABASE_FILE = 'tucajero.db';
const LICENSE_FILE = 'license.dat';

export function getEnvPath(): string {
  const baseDir = app.isPackaged ? path.dirname(app.getPath('exe')) : process.cwd();
  return path.join(baseDir, '.env');
}

export function getDatabasePath(): string {
  return app.isPackaged
    ? path.join(app.getPath('userData'), DATABASE_FILE)
    : path.join(process.cwd(), 'database', DATABASE_FILE);
}

export function getDatabaseTemplatePath(): string {
  return path.join(app.getAppPath(), 'database', DATABASE_FILE);
}

export function getPrismaEnginePath(): string {
  const appPath = app.getAppPath();
  const unpackedPath = appPath.replace('app.asar', 'app.asar.unpacked');
  return path.join(
    unpackedPath,
    'dist',
    'main',
    'app',
    'main',
    'repositories',
    'generated-client',
    'query_engine-windows.dll.node',
  );
}

export function getLogsDir(): string {
  return path.join(app.getPath('userData'), 'logs');
}

export function getBackupsDir(): string {
  return path.join(app.getPath('userData'), 'backups');
}

export function getPrinterDir(): string {
  return path.join(app.getPath('userData'), 'printer');
}

export function getTempInvoicesDir(): string {
  return path.join(getPrinterDir(), 'tmp-invoices');
}

export function getLicensePath(): string {
  return path.join(app.getPath('userData'), LICENSE_FILE);
}

export function getReportsDir(): string {
  return path.join(getDownloadsDir(), 'TuCajero-reportes');
}

export function getDownloadsDir(): string {
  return app.getPath('downloads');
}

export function ensureDir(dirPath: string): string {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  return dirPath;
}

export function isValidSQLiteFile(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const content = fs.readFileSync(filePath);
    if (content.length < 100) {
      return false;
    }

    const header = content.slice(0, 16).toString('latin1');
    return header.startsWith('SQLite format 3');
  } catch {
    return false;
  }
}
