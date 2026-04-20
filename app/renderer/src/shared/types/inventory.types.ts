export type StockMovementType = 'entrada' | 'salida' | 'ajuste' | 'venta';

export interface InventoryCategory {
  id?: number;
  name: string;
  color: string | null;
}

export interface InventoryMovement {
  id: number;
  productId: number;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string | null;
  userId: number;
  createdAt: string;
}

export interface InventoryProduct {
  id: number;
  code: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId?: number;
  category: InventoryCategory;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  criticalStock: number;
  taxRate?: number;
  suggestedPurchaseQty?: number | null;
  expiryDate: string | null;
  location: string | null;
  unitType?: string;
  conversionFactor?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stockMovements?: InventoryMovement[];
  salesLast30Days?: number;
}

export interface ProductDetail extends InventoryProduct {
  stockMovements: InventoryMovement[];
}

export interface ProductInput {
  code: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  categoryId?: number;
  categoryName?: string;
  price: number;
  cost: number;
  stock: number;
  minStock?: number;
  criticalStock?: number;
  taxRate?: number;
  suggestedPurchaseQty?: number | null;
  expiryDate?: string | null;
  location?: string | null;
  unitType?: string;
  conversionFactor?: number;
  userId: number;
}

export interface InventoryImportRow {
  code: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  category: string;
  categoryColor?: string | null;
  price: string;
  cost: string;
  stock: string;
  minStock?: string;
  criticalStock?: string;
  expiryDate?: string | null;
  location?: string | null;
}

export interface InventoryImportError {
  row: number | InventoryImportRow;
  code?: string;
  error?: string;
  message?: string;
}

export interface InventoryBulkImportResult {
  success: number;
  created: number;
  updated: number;
  errors: InventoryImportError[];
}

export interface InventoryAlertBuckets {
  critical: InventoryProduct[];
  warning: InventoryProduct[];
  ok: InventoryProduct[];
  expired?: InventoryProduct[];
  expiringSoon?: InventoryProduct[];
}

export interface InventoryExpiryBuckets {
  expired: InventoryProduct[];
  expiringSoon: InventoryProduct[];
  ok: InventoryProduct[];
}

export type Category = InventoryCategory;
export type Product = InventoryProduct;
export type StockMovement = InventoryMovement;
export type BulkImportRow = InventoryImportRow;
export type BulkImportResult = InventoryBulkImportResult;
export type StockAlerts = InventoryAlertBuckets;
export type ExpiryAlerts = InventoryExpiryBuckets;
export type StockAdjustmentResult = { previousStock: number; newStock: number };
