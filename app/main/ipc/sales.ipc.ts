import { ipcMain } from 'electron';

import type { ApiResponse } from '../../renderer/src/shared/types/api.types';
import type {
  CartItemInput,
  DailySummary,
  DashboardSummary,
  PaymentInput,
  SaleRecord,
} from '../../renderer/src/shared/types/sales.types';
import { generateInvoicePDF } from '../services/invoice.service';
import { SalesService } from '../services/sales.service';
import { ConfigService } from '../services/config.service';
import { PrinterService } from '../services/printer.service';
import { logger } from '../utils/logger';
import { toApiError } from '../utils/errors';

const printerService = new PrinterService();
import { cache } from '../utils/cache';

const salesService = new SalesService();
const configService = new ConfigService();

export function registerSalesIpc(): void {
  ipcMain.handle(
    'sales:create',
    async (
      _event,
      cashSessionId: number,
      userId: number,
      items: CartItemInput[],
      payments: PaymentInput[],
      discount = 0,
      deliveryFee = 0,
      customerId?: number,
    ): Promise<ApiResponse<SaleRecord>> => {
      try {
        const result = await salesService.createSale(
          cashSessionId,
          userId,
          items,
          payments,
          discount,
          deliveryFee,
          customerId,
        );
        logger.info('sales:create-success', {
          saleId: result.id,
          saleNumber: result.saleNumber,
          userId,
        });
        cache.invalidateByPrefix('inventory:');
        return { success: true, data: result };
      } catch (err) {
        logger.error('sales:create-error', { err, userId, cashSessionId });
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'sales:getById',
    async (_event, id: number): Promise<ApiResponse<SaleRecord | null>> => {
      try {
        const result = await salesService.getSaleById(id);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'sales:getByNumber',
    async (_event, saleNumber: string): Promise<ApiResponse<SaleRecord | null>> => {
      try {
        const result = await salesService.getSaleByNumber(saleNumber);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'sales:getByCashRegister',
    async (_event, cashSessionId: number): Promise<ApiResponse<SaleRecord[]>> => {
      try {
        const result = await salesService.getSalesByCashRegister(cashSessionId);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'sales:getByUser',
    async (_event, userId: number): Promise<ApiResponse<SaleRecord[]>> => {
      try {
        const result = await salesService.getSalesByUser(userId);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'sales:getByDateRange',
    async (_event, startDate: string, endDate: string): Promise<ApiResponse<SaleRecord[]>> => {
      try {
        // Convertir fechas considerando timezone local
        // Para evitar problemas de timezone, usamos el día siguiente a medianoche local
        const start = new Date(startDate + 'T00:00:00');
        // El endDate es el día siguiente a medianoche para incluir todo ese día
        const endDateObj = new Date(endDate + 'T00:00:00');
        endDateObj.setDate(endDateObj.getDate() + 1);

        // eslint-disable-next-line no-console
        console.log('[DEBUG IPC] getSalesByDateRange:', {
          startDate,
          endDate,
          start: start.toISOString(),
          end: endDateObj.toISOString(),
        });

        const result = await salesService.getSalesByDateRange(start, endDateObj);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'sales:cancel',
    async (_event, id: number, userId: number): Promise<ApiResponse<{ success: true }>> => {
      try {
        const result = await salesService.cancelSale(id, userId);
        logger.info('sales:cancel-success', { id, userId });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'sales:getDailySummary',
    async (_event, cashSessionId: number): Promise<ApiResponse<DailySummary>> => {
      try {
        const result = await salesService.getDailySummary(cashSessionId);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'sales:generateInvoice',
    async (_event, saleId: number): Promise<ApiResponse<string>> => {
      try {
        const sale = await salesService.getSaleById(saleId);
        if (!sale) {
          throw new Error('Venta no encontrada.');
        }

        const config = await configService.getConfig();
        const filePath = await generateInvoicePDF(sale, config);
        logger.info('sales:invoice-generated', {
          saleId,
          filePath,
          businessName: config.businessName,
        });

        const invoiceData = {
          invoiceNumber: sale.saleNumber,
          date: sale.createdAt,
          cashierName: sale.user.fullName,
          businessName: config.businessName,
          businessNIT: config.nit,
          businessAddress: config.address,
          businessPhone: config.phone,
          items: sale.items.map((item) => ({
            name: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            subtotal: item.subtotal,
            tax: item.subtotal * item.taxRate,
            total: item.total,
          })),
          subtotal: sale.subtotal,
          totalTax: sale.tax,
          discount: sale.discount,
          total: sale.total,
          payments: sale.payments.map((p) => ({
            method: p.method,
            amount: p.amount,
          })),
          change: sale.change,
        };

        const printResult = await printerService.printThermalReceipt(invoiceData);
        if (printResult.success) {
          logger.info('sales:invoice-printed-thermal', { saleId });
        } else {
          logger.warn('sales:invoice-thermal-print-failed', {
            saleId,
            message: printResult.message,
          });
        }

        return { success: true, data: filePath };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle('sales:getDashboardSummary', async (): Promise<ApiResponse<DashboardSummary>> => {
    try {
      const result = await salesService.getDashboardSummary();
      return { success: true, data: result };
    } catch (err) {
      logger.error('sales:getDashboardSummary-error', { err });
      return { success: false, error: toApiError(err) };
    }
  });
}
