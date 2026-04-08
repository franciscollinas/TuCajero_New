import { ipcMain } from 'electron';

import type { ApiResponse } from '../../renderer/src/shared/types/api.types';
import type { CartItemInput, DailySummary, DashboardSummary, PaymentInput, SaleRecord } from '../../renderer/src/shared/types/sales.types';
import { generateInvoicePDF } from '../services/invoice.service';
import { SalesService } from '../services/sales.service';
import { logger } from '../utils/logger';
import { toApiError } from '../utils/errors';

const salesService = new SalesService();

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
        logger.info('sales:create-success', { saleId: result.id, saleNumber: result.saleNumber, userId });
        return { success: true, data: result };
      } catch (err) {
        logger.error('sales:create-error', { err, userId, cashSessionId });
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle('sales:getById', async (_event, id: number): Promise<ApiResponse<SaleRecord | null>> => {
    try {
      const result = await salesService.getSaleById(id);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });

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
    'sales:getByDateRange',
    async (_event, startDate: string, endDate: string): Promise<ApiResponse<SaleRecord[]>> => {
      try {
        const result = await salesService.getSalesByDateRange(new Date(startDate), new Date(endDate));
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

  ipcMain.handle('sales:generateInvoice', async (_event, saleId: number): Promise<ApiResponse<string>> => {
    try {
      const sale = await salesService.getSaleById(saleId);
      if (!sale) {
        throw new Error('Venta no encontrada.');
      }

      const filePath = await generateInvoicePDF(sale);
      logger.info('sales:invoice-generated', { saleId, filePath });
      return { success: true, data: filePath };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });

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
