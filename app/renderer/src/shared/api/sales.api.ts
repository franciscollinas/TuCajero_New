import type { ApiResponse } from '../types/api.types';
import type { CartItemInput, DailySummary, PaymentInput, SaleRecord } from '../types/sales.types';

export function createSale(
  cashSessionId: number,
  userId: number,
  items: CartItemInput[],
  payments: PaymentInput[],
  discount = 0,
): Promise<ApiResponse<SaleRecord>> {
  return window.api.invoke<SaleRecord>('sales:create', cashSessionId, userId, items, payments, discount);
}

export function getSaleById(id: number): Promise<ApiResponse<SaleRecord | null>> {
  return window.api.invoke<SaleRecord | null>('sales:getById', id);
}

export function getSaleByNumber(saleNumber: string): Promise<ApiResponse<SaleRecord | null>> {
  return window.api.invoke<SaleRecord | null>('sales:getByNumber', saleNumber);
}

export function getSalesByCashRegister(cashSessionId: number): Promise<ApiResponse<SaleRecord[]>> {
  return window.api.invoke<SaleRecord[]>('sales:getByCashRegister', cashSessionId);
}

export function getSalesByDateRange(
  startDate: string,
  endDate: string,
): Promise<ApiResponse<SaleRecord[]>> {
  return window.api.invoke<SaleRecord[]>('sales:getByDateRange', startDate, endDate);
}

export function cancelSale(id: number, userId: number): Promise<ApiResponse<{ success: true }>> {
  return window.api.invoke<{ success: true }>('sales:cancel', id, userId);
}

export function getDailySummary(cashSessionId: number): Promise<ApiResponse<DailySummary>> {
  return window.api.invoke<DailySummary>('sales:getDailySummary', cashSessionId);
}

export function generateInvoice(saleId: number): Promise<ApiResponse<string>> {
  return window.api.invoke<string>('sales:generateInvoice', saleId);
}
