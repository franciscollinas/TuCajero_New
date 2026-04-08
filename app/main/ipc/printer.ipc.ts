import { ipcMain } from 'electron';

import type { ApiResponse } from '../../renderer/src/shared/types/api.types';
import type {
  InvoiceData,
  PrinterConfig,
  PrintResult,
} from '../../renderer/src/shared/types/printer.types';
import { PrinterService } from '../services/printer.service';
import { toApiError } from '../utils/errors';
import { logger } from '../utils/logger';

const printerService = new PrinterService();

export function registerPrinterIpc(): void {
  ipcMain.handle(
    'printer:generateInvoice',
    async (_event, invoice: InvoiceData): Promise<ApiResponse<{ filePath: string }>> => {
      try {
        const filePath = await printerService.saveInvoiceHTML(invoice);
        logger.info('printer:generateInvoice', { filePath });
        return { success: true, data: { filePath } };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'printer:openInvoice',
    async (_event, filePath: string): Promise<ApiResponse<{ success: boolean }>> => {
      try {
        const pathMod = await import('path');
        // Only allow files from the tmp-invoices directory
        const invoiceDir = pathMod.join(process.cwd(), 'tmp-invoices');
        const resolved = pathMod.resolve(filePath);
        const resolvedDir = pathMod.resolve(invoiceDir);

        if (!resolved.startsWith(resolvedDir)) {
          return {
            success: false,
            error: { code: 'FORBIDDEN', message: 'Acceso denegado: archivo fuera del directorio permitido.' },
          };
        }

        const { shell } = await import('electron');
        const result = await shell.openPath(resolved);
        if (result) {
          return { success: false, error: toApiError(new Error(result)) };
        }
        return { success: true, data: { success: true } };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'printer:generateThermal',
    async (_event, invoice: InvoiceData): Promise<ApiResponse<{ content: string }>> => {
      try {
        const content = printerService.generateThermalReceipt(invoice);
        return { success: true, data: { content } };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'printer:printHardware',
    async (_event, invoice: InvoiceData): Promise<ApiResponse<PrintResult>> => {
      try {
        const result = await printerService.printThermalReceipt(invoice);
        logger.info('printer:printHardware', { success: result.success });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'printer:getConfig',
    async (): Promise<ApiResponse<PrinterConfig>> => {
      try {
        const config = printerService.getPrinterConfig();
        return { success: true, data: config };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'printer:updateConfig',
    async (_event, config: Partial<PrinterConfig>): Promise<ApiResponse<PrinterConfig>> => {
      try {
        const updated = printerService.updatePrinterConfig(config as Parameters<typeof printerService.updatePrinterConfig>[0]);
        return { success: true, data: updated };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'printer:testPrinter',
    async (): Promise<ApiResponse<PrintResult>> => {
      try {
        const result = await printerService.testPrinter();
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );
}
