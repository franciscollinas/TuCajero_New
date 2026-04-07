import { app, BrowserWindow } from 'electron';
import { join } from 'path';

import { registerAuthIpc } from './ipc/auth.ipc';
import { registerAuditIpc } from './ipc/audit.ipc';
import { registerCashSessionIpc } from './ipc/cash-session.ipc';
import { registerInventoryIpc } from './ipc/inventory.ipc';
import { registerPingIpc } from './ipc/ping.ipc';
import { registerSalesIpc } from './ipc/sales.ipc';
import { registerUsersIpc } from './ipc/users.ipc';
import { prisma } from './repositories/prisma';
import { seedDatabase } from './repositories/seed';
import { logger } from './utils/logger';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function isEpipeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'EPIPE';
}

function installProcessGuards(): void {
  process.stdout?.on?.('error', (error) => {
    if (!isEpipeError(error)) {
      throw error;
    }
  });

  process.stderr?.on?.('error', (error) => {
    if (!isEpipeError(error)) {
      throw error;
    }
  });

  process.on('uncaughtException', (error) => {
    if (isEpipeError(error)) {
      return;
    }

    logger.error('app:uncaught-exception', { error });
  });
}

async function loadRenderer(win: BrowserWindow): Promise<void> {
  if (!isDev) {
    await win.loadFile(join(__dirname, '../../../renderer/index.html'));
    return;
  }

  const url = 'http://localhost:5173';

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await win.loadURL(url);
      win.webContents.openDevTools();
      return;
    } catch {
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    }
  }

  throw new Error(`No se pudo cargar el renderer en ${url}.`);
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'TuCajero',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  loadRenderer(win)
    .then(() => {
      logger.info('app:window-created');
    })
    .catch((error: unknown) => {
      logger.error('app:window-create-failed', { error });
    });
}

installProcessGuards();

app.whenReady().then(async () => {
  await seedDatabase();
  registerAuthIpc();
  registerAuditIpc();
  registerCashSessionIpc();
  registerInventoryIpc();
  registerPingIpc();
  registerSalesIpc();
  registerUsersIpc();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  void prisma.$disconnect();
});
