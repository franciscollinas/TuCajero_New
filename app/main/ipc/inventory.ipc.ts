import { ipcMain } from 'electron';
import type { ApiResponse } from '../../renderer/src/shared/types/api.types';
import type {
  BulkImportResult,
  BulkImportRow,
  Category,
  ExpiryAlerts,
  Product,
  ProductDetail,
  ProductInput,
  StockAdjustmentResult,
  StockAlerts,
} from '../../renderer/src/shared/types/inventory.types';

import { InventoryService } from '../services/inventory.service';
import { logger } from '../utils/logger';
import { toApiError } from '../utils/errors';
import { cache, CACHE_TTL } from '../utils/cache';

const inventoryService = new InventoryService();

export function registerInventoryIpc(): void {
  ipcMain.handle('inventory:getCategories', async (): Promise<ApiResponse<Category[]>> => {
    try {
      const result = await cache.getOrSet('categories', CACHE_TTL.CATEGORIES, () =>
        inventoryService.getCategories(),
      );
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });

  ipcMain.handle(
    'inventory:getAll',
    async (
      _event,
      options?: { page?: number; pageSize?: number; search?: string; categoryId?: number },
    ): Promise<ApiResponse<Product[]>> => {
      try {
        // Only cache if no search/filter to avoid stale results
        const cacheKey =
          options?.search || options?.categoryId
            ? null
            : `inventory:all:${options?.page || 1}:${options?.pageSize || 'all'}`;

        const result = cacheKey
          ? await cache.getOrSet(cacheKey, CACHE_TTL.INVENTORY, () =>
              inventoryService.getAllProducts(options),
            )
          : await inventoryService.getAllProducts(options);

        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'inventory:getById',
    async (_event, id: number): Promise<ApiResponse<ProductDetail>> => {
      try {
        const result = await inventoryService.getProductById(id);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'inventory:getByBarcode',
    async (_event, barcode: string): Promise<ApiResponse<Product | null>> => {
      try {
        const result = await inventoryService.getProductByBarcode(barcode);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'inventory:create',
    async (_event, data: ProductInput): Promise<ApiResponse<Product>> => {
      try {
        const result = await inventoryService.createProduct(data);
        // Invalidate all inventory caches
        cache.invalidateByPrefix('inventory:');
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'inventory:update',
    async (_event, id: number, data: Partial<ProductInput>): Promise<ApiResponse<Product>> => {
      try {
        const result = await inventoryService.updateProduct(id, data);
        // Invalidate all inventory caches
        Array.from(cache['store'].keys())
          .filter((k) => k.startsWith('inventory:'))
          .forEach((k) => cache.invalidate(k));
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle('inventory:delete', async (_event, id: number): Promise<ApiResponse<Product>> => {
    try {
      const result = await inventoryService.deleteProduct(id);
      // Invalidate all inventory caches
      Array.from(cache['store'].keys())
        .filter((k) => k.startsWith('inventory:'))
        .forEach((k) => cache.invalidate(k));
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });

  ipcMain.handle(
    'inventory:adjustStock',
    async (
      _event,
      productId: number,
      quantity: number,
      reason: string,
      userId: number,
    ): Promise<ApiResponse<StockAdjustmentResult>> => {
      try {
        const result = await inventoryService.adjustStock(productId, quantity, reason, userId);
        logger.info('inventory:adjust-stock', { productId, quantity, userId });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle('inventory:getStockAlerts', async (): Promise<ApiResponse<StockAlerts>> => {
    try {
      const result = await inventoryService.getStockAlerts();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });

  ipcMain.handle('inventory:getExpiryAlerts', async (): Promise<ApiResponse<ExpiryAlerts>> => {
    try {
      const result = await inventoryService.getExpiryAlerts();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });

  ipcMain.handle(
    'inventory:bulkImport',
    async (
      _event,
      products: BulkImportRow[],
      userId: number,
    ): Promise<ApiResponse<BulkImportResult>> => {
      try {
        const result = await inventoryService.bulkImportProducts(products, userId);

        // Invalidate all inventory caches to ensure the next fetch gets real data
        Array.from(cache['store'].keys())
          .filter((k) => k.startsWith('inventory:'))
          .forEach((k) => cache.invalidate(k));

        logger.info('inventory:bulk-import-success', {
          success: result.success,
          errors: result.errors.length,
          userId,
        });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );
}
