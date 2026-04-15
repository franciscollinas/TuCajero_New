import { app, BrowserWindow } from 'electron';

console.log('[MAIN] Electron app module loaded, app is:', app ? 'defined' : 'undefined');
console.log('[MAIN] process.type:', process.type);

import { join } from 'path';

import { registerAlertsIpc } from './ipc/alerts.ipc';
import { registerAuthIpc } from './ipc/auth.ipc';
import { registerBackupIpc } from './ipc/backup.ipc';
import { registerConfigIpc } from './ipc/config.ipc';
import { registerAuditIpc } from './ipc/audit.ipc';
import { registerCashSessionIpc } from './ipc/cash-session.ipc';
import { registerInventoryIpc } from './ipc/inventory.ipc';
import { registerLicenseIpc } from './ipc/license.ipc';
import { registerPingIpc } from './ipc/ping.ipc';
import { registerPrinterIpc } from './ipc/printer.ipc';
import { registerReportsIpc } from './ipc/reports.ipc';
import { registerSalesIpc } from './ipc/sales.ipc';
import { registerUsersIpc } from './ipc/users.ipc';
import { registerCustomersIpc } from './ipc/customers.ipc';
import { registerPurchaseIpc } from './ipc/purchase.ipc';
import { prisma } from './repositories/prisma';
import { seedDatabase } from './repositories/seed';
import { seedProducts } from './repositories/seed-products';
import { logger } from './utils/logger';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
console.log(
  '[MAIN] isDev check:',
  isDev,
  '(NODE_ENV:',
  process.env.NODE_ENV,
  ', isPackaged:',
  app.isPackaged,
  ')',
);

function isEpipeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'EPIPE';
}

function installProcessGuards(): void {
  process.stdout?.on?.('error', (error) => {
    if (!isEpipeError(error)) {
      console.error('STDOUT ERROR:', error);
      throw error;
    }
  });

  process.stderr?.on?.('error', (error) => {
    if (!isEpipeError(error)) {
      console.error('STDERR ERROR:', error);
      throw error;
    }
  });

  process.on('uncaughtException', (error) => {
    if (isEpipeError(error)) {
      return;
    }
    console.error('═══════════════════════════════════════════');
    console.error('UNCAUGHT EXCEPTION:');
    console.error(error);
    if (error instanceof Error && error.stack) {
      console.error('STACK:', error.stack);
    }
    console.error('═══════════════════════════════════════════');
    logger.error('app:uncaught-exception', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'N/A',
    });
  });
}

async function loadRenderer(win: BrowserWindow): Promise<void> {
  console.log('[MAIN] loadRenderer called, isDev:', isDev);

  if (!isDev) {
    console.log('[MAIN] Loading from file:', join(__dirname, '../../../renderer/index.html'));
    await win.loadFile(join(__dirname, '../../../renderer/index.html'));
    return;
  }

  const url = 'http://localhost:5173';
  console.log('[MAIN] Loading dev URL:', url);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await win.loadURL(url);
      console.log('[MAIN] URL loaded successfully');
      win.webContents.openDevTools();
      return;
    } catch (err) {
      console.log(
        `[MAIN] Load attempt ${attempt + 1} failed, retrying...`,
        err instanceof Error ? err.message : err,
      );
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    }
  }

  console.error('[MAIN] FATAL: Failed to load renderer after 20 attempts');
  throw new Error(`No se pudo cargar el renderer en ${url}.`);
}

function createWindow(): void {
  console.log('[MAIN] createWindow() called');

  const win = new BrowserWindow({
    x: 50,
    y: 50,
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'TuCajero POS',
    show: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  console.log('[MAIN] BrowserWindow created, bounds:', win.getBounds());

  // Listen for renderer crashes
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error(
      '[MAIN] Renderer process gone! Reason:',
      details.reason,
      'Exit code:',
      details.exitCode,
    );
  });

  win.webContents.on('did-fail-load', (_event, code, desc) => {
    console.error('[MAIN] Renderer failed to load! Code:', code, 'Description:', desc);
  });

  win.webContents.on('console-message', (_event, _level, message) => {
    console.log(`[RENDERER] ${message}`);
  });

  win.focus();
  win.restore();
  win.show();
  console.log('[MAIN] Window focus/show called, isDestroyed:', win.isDestroyed());

  loadRenderer(win)
    .then(() => {
      console.log('[MAIN] Renderer loaded successfully, app is ready!');
      logger.info('app:window-created');
    })
    .catch((error: unknown) => {
      console.error('═══════════════════════════════════════════');
      console.error('FATAL: Renderer loading failed');
      console.error(error);
      if (error instanceof Error) console.error('Stack:', error.stack);
      console.error('═══════════════════════════════════════════');
      console.error('[MAIN] Keeping window open for debugging...');
      // NO cerrar la app — mantenerla abierta para debug
      logger.error('app:window-create-failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'N/A',
      });
    });
}

installProcessGuards();

app.whenReady().then(async () => {
  try {
    console.log('INFO: Starting app initialization...');
    await seedDatabase();
    await seedProducts();
    console.log('INFO: Database seeded');
    registerAlertsIpc();
    registerAuthIpc();
    registerAuditIpc();
    registerBackupIpc();
    registerConfigIpc();
    registerCashSessionIpc();
    registerInventoryIpc();
    registerLicenseIpc();
    registerPingIpc();
    registerPrinterIpc();
    registerReportsIpc();
    registerSalesIpc();
    registerUsersIpc();
    registerCustomersIpc();
    registerPurchaseIpc();
    console.log('INFO: All IPC handlers registered');
    createWindow();
  } catch (error) {
    console.error('FATAL: App initialization failed:', error);
    if (error instanceof Error) console.error('Stack:', error.stack);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  console.log('[MAIN] window-all-closed event fired');
  if (process.platform !== 'darwin') {
    console.log('[MAIN] Quitting app...');
    app.quit();
  }
});

app.on('before-quit', () => {
  void prisma.$disconnect();
});
