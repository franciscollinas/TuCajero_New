import { app, BrowserWindow, dialog } from 'electron';
import { readFileSync, existsSync, copyFileSync, statSync } from 'fs';
import { join, dirname } from 'path';

const envPath = join(app.isPackaged ? dirname(app.getPath('exe')) : process.cwd(), '.env');
if (existsSync(envPath)) {
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
    if (key) process.env[key] = value;
  });
}

if (app.isPackaged) {
  const dbPath = join(app.getPath('userData'), 'tucajero.db');
  process.env.DATABASE_URL = `file:${dbPath}`;
}

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
import { registerCustomersIpc } from './ipc/customers.ipc';
import { registerPurchaseIpc } from './ipc/purchase.ipc';
import { registerUsersIpc } from './ipc/users.ipc';
import { seedDatabase } from './repositories/seed';

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
      devTools: true, // Always enable for debugging
    },
  });

  if (app.isPackaged) {
    win.setMenu(null);
  }

  // Register Ctrl+Shift+I to open devtools
  win.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key === 'I') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  if (app.isPackaged) {
    const rendererPath = join(__dirname, '../../../renderer/index.html');
    win.loadFile(rendererPath);
  } else {
    const devServerUrl = 'http://localhost:5173';
    win.loadURL(devServerUrl);
  }
}

app.whenReady().then(async () => {
  try {
    const dbPath = join(app.getPath('userData'), 'tucajero.db');

    let shouldCopy = !existsSync(dbPath);
    if (!shouldCopy && statSync(dbPath).size < 50000) {
      shouldCopy = true;
    }

    if (app.isPackaged && shouldCopy) {
      const templatePath = join(app.getAppPath(), 'database/tucajero.db');
      if (existsSync(templatePath)) {
        copyFileSync(templatePath, dbPath);
        // eslint-disable-next-line no-console
        console.log('Plantilla copiada con éxito.');
      }
    }

    // eslint-disable-next-line no-console
    console.log('Iniciando base de datos...');
    await seedDatabase();
    // eslint-disable-next-line no-console
    console.log('Base de datos inicializada correctamente');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('ERROR CRÍTICO AL INICIALIZAR DB:', err);
    dialog.showErrorBox(
      'Error de Base de Datos',
      `No se pudo inicializar la base de datos: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

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

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
