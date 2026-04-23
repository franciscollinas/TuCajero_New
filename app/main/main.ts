import { app, BrowserWindow, dialog } from 'electron';
import { appendFileSync, copyFileSync, existsSync, readFileSync } from 'fs';
import os from 'os';
import { join } from 'path';

import { registerAlertsIpc } from './ipc/alerts.ipc';
import { registerAuthIpc } from './ipc/auth.ipc';
import { registerAuditIpc } from './ipc/audit.ipc';
import { registerBackupIpc } from './ipc/backup.ipc';
import { registerCashSessionIpc } from './ipc/cash-session.ipc';
import { AuditService } from './services/audit.service';
import { registerConfigIpc } from './ipc/config.ipc';
import { registerCustomersIpc } from './ipc/customers.ipc';
import { registerInventoryIpc } from './ipc/inventory.ipc';
import { registerLicenseIpc } from './ipc/license.ipc';
import { registerPingIpc } from './ipc/ping.ipc';
import { registerPrinterIpc } from './ipc/printer.ipc';
import { registerPurchaseIpc } from './ipc/purchase.ipc';
import { registerReportsIpc } from './ipc/reports.ipc';
import { registerSalesIpc } from './ipc/sales.ipc';
import { registerUsersIpc } from './ipc/users.ipc';
import { seedDatabase } from './repositories/seed';
import { logger } from './utils/logger';
import {
  getDatabasePath,
  getDatabaseTemplatePath,
  getEnvPath,
  isValidSQLiteFile,
} from './utils/paths';

const REQUIRED_TABLES = [
  'User',
  'Session',
  'Category',
  'Product',
  'StockMovement',
  'Sale',
  'SaleItem',
  'Payment',
  'CashSession',
  'AuditLog',
  'Config',
  'Customer',
  'Debt',
  'Supplier',
  'PurchaseOrder',
  'PurchaseOrderItem',
] as const;

const BOOT_TRACE_FILE = join(os.tmpdir(), 'tucajero-boot.log');

function bootTrace(message: string, extra?: Record<string, unknown>): void {
  try {
    const timestamp = new Date().toISOString();
    const payload = extra ? ` ${JSON.stringify(extra)}` : '';
    appendFileSync(BOOT_TRACE_FILE, `[${timestamp}] ${message}${payload}\n`, 'utf8');
  } catch {
    // Ignore bootstrap trace failures.
  }
}

function loadEnvFile(): void {
  const envPath = getEnvPath();
  if (!existsSync(envPath)) {
    return;
  }

  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const equalIdx = trimmed.indexOf('=');
    if (equalIdx === -1) return;

    const key = trimmed.slice(0, equalIdx).trim();
    let value = trimmed.slice(equalIdx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) {
      process.env[key] = value;
    }
  });
}

function configureDatabaseEnv(): void {
  process.env.DATABASE_URL = `file:${getDatabasePath()}`;
}

async function hasRequiredSchema(dbPath: string): Promise<boolean> {
  const originalUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = `file:${dbPath}`;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require('./repositories/generated-client');
    const prisma = new PrismaClient();

    try {
      const rows = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
      `;

      const tables = new Set(rows.map((row) => row.name));
      return REQUIRED_TABLES.every((tableName) => tables.has(tableName));
    } finally {
      await prisma.$disconnect();
    }
  } catch {
    return false;
  } finally {
    process.env.DATABASE_URL = originalUrl;
  }
}

function backupIncompatibleDatabase(dbPath: string): void {
  const backupPath = `${dbPath}.incompatible-${Date.now()}.bak`;
  copyFileSync(dbPath, backupPath);
  // eslint-disable-next-line no-console
  console.warn(`Base de datos incompatible respaldada en ${backupPath}`);
}

async function ensurePackagedDatabase(): Promise<void> {
  if (!app.isPackaged) {
    return;
  }

  const dbPath = getDatabasePath();
  const hasValidFile = isValidSQLiteFile(dbPath);
  if (hasValidFile && (await hasRequiredSchema(dbPath))) {
    return;
  }

  if (hasValidFile) {
    backupIncompatibleDatabase(dbPath);
  }

  const templatePath = getDatabaseTemplatePath();
  if (!existsSync(templatePath)) {
    throw new Error(`No se encontro la plantilla inicial de la base de datos en ${templatePath}`);
  }

  copyFileSync(templatePath, dbPath);
  // eslint-disable-next-line no-console
  console.log('Plantilla copiada con exito.');
}

function registerIpcHandlers(): void {
  registerAlertsIpc();
  registerAuthIpc();
  registerBackupIpc();
  registerConfigIpc();
  registerAuditIpc();
  registerCashSessionIpc();
  registerInventoryIpc();
  registerLicenseIpc();
  registerPingIpc();
  registerPrinterIpc();
  registerReportsIpc();
  registerSalesIpc();
  registerCustomersIpc();
  registerPurchaseIpc();
  registerUsersIpc();
}

function setupProcessDiagnostics(): void {
  process.on('uncaughtException', (error) => {
    logger.error('main:uncaught-exception', { error });
    dialog.showErrorBox('Error inesperado', error.message);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('main:unhandled-rejection', { reason });
  });

  app.on('render-process-gone', (_event, webContents, details) => {
    logger.error('main:render-process-gone', {
      url: webContents.getURL(),
      reason: details.reason,
      exitCode: details.exitCode,
    });
  });

  app.on('child-process-gone', (_event, details) => {
    logger.error('main:child-process-gone', details);
  });

  app.on('web-contents-created', (_event, contents) => {
    contents.on(
      'did-fail-load',
      (_loadEvent, errorCode, errorDescription, validatedURL, isMainFrame) => {
        logger.error('main:did-fail-load', {
          errorCode,
          errorDescription,
          validatedURL,
          isMainFrame,
        });
      },
    );

    contents.on('render-process-gone', (_renderEvent, details) => {
      logger.error('main:webcontents-render-gone', {
        url: contents.getURL(),
        reason: details.reason,
        exitCode: details.exitCode,
      });
    });
  });

  app.on('window-all-closed', () => {
    logger.info('main:window-all-closed');
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'TuCajero POS',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      devTools: true,
    },
  });

  if (app.isPackaged) {
    win.setMenu(null);
  }

  win.on('closed', () => {
    logger.info('main:window-closed');
  });

  win.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key === 'I') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  if (app.isPackaged) {
    const rendererPath = join(__dirname, '../../../renderer/index.html');
    logger.info('main:load-file', { rendererPath });
    win.loadFile(rendererPath);
  } else {
    logger.info('main:load-url', { url: 'http://localhost:5173' });
    win.loadURL('http://localhost:5173');
  }
}

loadEnvFile();
configureDatabaseEnv();
setupProcessDiagnostics();
bootTrace('main:bootstrap-loaded', {
  isPackaged: app.isPackaged,
  databasePath: getDatabasePath(),
});

app.whenReady().then(async () => {
  bootTrace('main:when-ready');
  try {
    await ensurePackagedDatabase();
    // eslint-disable-next-line no-console
    console.log('Iniciando base de datos...');
    logger.info('main:database-init-start', { databasePath: getDatabasePath() });
    await seedDatabase();
    // eslint-disable-next-line no-console
    console.log('Base de datos inicializada correctamente');
    logger.info('main:database-init-success');
    bootTrace('main:database-init-success');

    try {
      const auditService = new AuditService();
      const deletedLogs = await auditService.cleanOldLogs(6);
      if (deletedLogs > 0) {
        logger.info('main:audit-logs-cleaned', { deletedLogs });
        // eslint-disable-next-line no-console
        console.log(`Se eliminaron ${deletedLogs} logs de auditoría antiguos.`);
      }
    } catch (auditErr) {
      logger.error('main:audit-logs-clean-error', { err: auditErr });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('ERROR CRITICO AL INICIALIZAR DB:', err);
    logger.error('main:database-init-error', { err });
    bootTrace('main:database-init-error', {
      message: err instanceof Error ? err.message : String(err),
    });
    dialog.showErrorBox(
      'Error de Base de Datos',
      `No se pudo inicializar la base de datos: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  registerIpcHandlers();
  bootTrace('main:ipc-registered');
  createWindow();
  bootTrace('main:window-created');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
