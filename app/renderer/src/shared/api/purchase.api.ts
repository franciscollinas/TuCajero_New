import type { ApiResponse } from '../types/api.types';
import type {
  Supplier,
  PurchaseOrder,
  CreateSupplierInput,
  CreatePurchaseOrderInput,
  ReceiveItemInput,
  PurchaseSummary,
} from '../types/purchase.types';

export function getAllSuppliers(): Promise<ApiResponse<Supplier[]>> {
  return window.api.invoke<Supplier[]>('purchase:getAllSuppliers');
}

export function getSupplierById(id: number): Promise<ApiResponse<Supplier | null>> {
  return window.api.invoke<Supplier | null>('purchase:getSupplierById', id);
}

export function createSupplier(data: CreateSupplierInput): Promise<ApiResponse<Supplier>> {
  return window.api.invoke<Supplier>('purchase:createSupplier', data);
}

export function updateSupplier(
  id: number,
  data: Partial<CreateSupplierInput>,
): Promise<ApiResponse<Supplier>> {
  return window.api.invoke<Supplier>('purchase:updateSupplier', id, data);
}

export function deleteSupplier(id: number): Promise<ApiResponse<{ success: true }>> {
  return window.api.invoke<{ success: true }>('purchase:deleteSupplier', id);
}

export function getPurchaseOrders(): Promise<ApiResponse<PurchaseOrder[]>> {
  return window.api.invoke<PurchaseOrder[]>('purchase:getPurchaseOrders');
}

export function getPurchaseOrderById(id: number): Promise<ApiResponse<PurchaseOrder | null>> {
  return window.api.invoke<PurchaseOrder | null>('purchase:getPurchaseOrderById', id);
}

export function createPurchaseOrder(
  userId: number,
  data: CreatePurchaseOrderInput,
): Promise<ApiResponse<PurchaseOrder>> {
  return window.api.invoke<PurchaseOrder>('purchase:createPurchaseOrder', userId, data);
}

export function updatePurchaseOrderStatus(
  id: number,
  status: string,
): Promise<ApiResponse<PurchaseOrder>> {
  return window.api.invoke<PurchaseOrder>('purchase:updatePurchaseOrderStatus', id, status);
}

export function receiveItems(
  orderId: number,
  userId: number,
  items: ReceiveItemInput[],
): Promise<ApiResponse<PurchaseOrder>> {
  return window.api.invoke<PurchaseOrder>('purchase:receiveItems', orderId, userId, items);
}

export function updatePurchaseOrder(
  id: number,
  data: Partial<CreatePurchaseOrderInput>,
): Promise<ApiResponse<PurchaseOrder>> {
  return window.api.invoke<PurchaseOrder>('purchase:updatePurchaseOrder', id, data);
}

export function deletePurchaseOrder(id: number): Promise<ApiResponse<{ success: true }>> {
  return window.api.invoke<{ success: true }>('purchase:deletePurchaseOrder', id);
}

export function getPurchaseSummary(): Promise<ApiResponse<PurchaseSummary>> {
  return window.api.invoke<PurchaseSummary>('purchase:getPurchaseSummary');
}
