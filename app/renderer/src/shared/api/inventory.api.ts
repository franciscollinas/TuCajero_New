import type { ApiResponse } from '../types/api.types';
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
} from '../types/inventory.types';

export function getCategories(): Promise<ApiResponse<Category[]>> {
  return window.api.invoke<Category[]>('inventory:getCategories');
}

export function getAllProducts(): Promise<ApiResponse<Product[]>> {
  return window.api.invoke<Product[]>('inventory:getAll');
}

export function getProductById(id: number): Promise<ApiResponse<ProductDetail>> {
  return window.api.invoke<ProductDetail>('inventory:getById', id);
}

export function getProductByBarcode(barcode: string): Promise<ApiResponse<Product | null>> {
  return window.api.invoke<Product | null>('inventory:getByBarcode', barcode);
}

export function createProduct(data: ProductInput): Promise<ApiResponse<Product>> {
  return window.api.invoke<Product>('inventory:create', data);
}

export function updateProduct(id: number, data: Partial<ProductInput>): Promise<ApiResponse<Product>> {
  return window.api.invoke<Product>('inventory:update', id, data);
}

export function deleteProduct(id: number): Promise<ApiResponse<Product>> {
  return window.api.invoke<Product>('inventory:delete', id);
}

export function adjustStock(
  productId: number,
  quantity: number,
  reason: string,
  userId: number,
): Promise<ApiResponse<StockAdjustmentResult>> {
  return window.api.invoke<StockAdjustmentResult>(
    'inventory:adjustStock',
    productId,
    quantity,
    reason,
    userId,
  );
}

export function getStockAlerts(): Promise<ApiResponse<StockAlerts>> {
  return window.api.invoke<StockAlerts>('inventory:getStockAlerts');
}

export function getExpiryAlerts(): Promise<ApiResponse<ExpiryAlerts>> {
  return window.api.invoke<ExpiryAlerts>('inventory:getExpiryAlerts');
}

export function bulkImportProducts(
  products: BulkImportRow[],
  userId: number,
): Promise<ApiResponse<BulkImportResult>> {
  return window.api.invoke<BulkImportResult>('inventory:bulkImport', products, userId);
}
