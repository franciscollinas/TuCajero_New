import { ipcMain } from 'electron';

import type { ApiResponse } from '../../renderer/src/shared/types/api.types';
import type {
  Supplier,
  PurchaseOrder,
  CreateSupplierInput,
  CreatePurchaseOrderInput,
  ReceiveItemInput,
  PurchaseSummary,
  PurchaseOrderStatus,
} from '../../renderer/src/shared/types/purchase.types';
import { PurchaseService } from '../services/purchase.service';
import { logger } from '../utils/logger';
import { toApiError } from '../utils/errors';

const purchaseService = new PurchaseService();

export function registerPurchaseIpc(): void {
  ipcMain.handle('purchase:getAllSuppliers', async (): Promise<ApiResponse<Supplier[]>> => {
    try {
      const result = await purchaseService.getAllSuppliers();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });

  ipcMain.handle(
    'purchase:getSupplierById',
    async (_event, id: number): Promise<ApiResponse<Supplier | null>> => {
      try {
        const result = await purchaseService.getSupplierById(id);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'purchase:createSupplier',
    async (_event, data: CreateSupplierInput): Promise<ApiResponse<Supplier>> => {
      try {
        const result = await purchaseService.createSupplier(data);
        logger.info('purchase:createSupplier-success', {
          supplierId: result.id,
          name: result.name,
        });
        return { success: true, data: result };
      } catch (err) {
        logger.error('purchase:createSupplier-error', { err });
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'purchase:updateSupplier',
    async (
      _event,
      id: number,
      data: Partial<CreateSupplierInput>,
    ): Promise<ApiResponse<Supplier>> => {
      try {
        const result = await purchaseService.updateSupplier(id, data);
        logger.info('purchase:updateSupplier-success', { supplierId: id });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'purchase:deleteSupplier',
    async (_event, id: number): Promise<ApiResponse<{ success: true }>> => {
      try {
        const result = await purchaseService.deleteSupplier(id);
        logger.info('purchase:deleteSupplier-success', { supplierId: id });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle('purchase:getPurchaseOrders', async (): Promise<ApiResponse<PurchaseOrder[]>> => {
    try {
      const result = await purchaseService.getPurchaseOrders();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });

  ipcMain.handle(
    'purchase:getPurchaseOrderById',
    async (_event, id: number): Promise<ApiResponse<PurchaseOrder | null>> => {
      try {
        const result = await purchaseService.getPurchaseOrderById(id);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'purchase:createPurchaseOrder',
    async (
      _event,
      userId: number,
      data: CreatePurchaseOrderInput,
    ): Promise<ApiResponse<PurchaseOrder>> => {
      try {
        const result = await purchaseService.createPurchaseOrder(userId, data);
        logger.info('purchase:createPurchaseOrder-success', {
          orderId: result.id,
          orderNumber: result.orderNumber,
        });
        return { success: true, data: result };
      } catch (err) {
        logger.error('purchase:createPurchaseOrder-error', { err });
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'purchase:updatePurchaseOrderStatus',
    async (_event, id: number, status: string): Promise<ApiResponse<PurchaseOrder>> => {
      try {
        const result = await purchaseService.updatePurchaseOrderStatus(
          id,
          status as PurchaseOrderStatus,
        );
        logger.info('purchase:updatePurchaseOrderStatus-success', { orderId: id, status });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'purchase:receiveItems',
    async (
      _event,
      orderId: number,
      userId: number,
      items: ReceiveItemInput[],
    ): Promise<ApiResponse<PurchaseOrder>> => {
      try {
        const result = await purchaseService.receiveItems(orderId, userId, items);
        logger.info('purchase:receiveItems-success', { orderId: result.id });
        return { success: true, data: result };
      } catch (err) {
        logger.error('purchase:receiveItems-error', { err });
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'purchase:updatePurchaseOrder',
    async (
      _event,
      id: number,
      data: Partial<CreatePurchaseOrderInput>,
    ): Promise<ApiResponse<PurchaseOrder>> => {
      try {
        const result = await purchaseService.updatePurchaseOrder(id, data);
        logger.info('purchase:updatePurchaseOrder-success', { orderId: id });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'purchase:deletePurchaseOrder',
    async (_event, id: number): Promise<ApiResponse<{ success: true }>> => {
      try {
        const result = await purchaseService.deletePurchaseOrder(id);
        logger.info('purchase:deletePurchaseOrder-success', { orderId: id });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle('purchase:getPurchaseSummary', async (): Promise<ApiResponse<PurchaseSummary>> => {
    try {
      const result = await purchaseService.getPurchaseSummary();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });
}
