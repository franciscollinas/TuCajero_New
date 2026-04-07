import type { ApiResponse } from '../types/api.types';
import type { CashRegister } from '../types/cash.types';

export async function getActiveCashRegister(
  userId: number,
): Promise<ApiResponse<CashRegister | null>> {
  return window.api.invoke<CashRegister | null>('cash:getActive', userId);
}

export async function openCashRegister(
  userId: number,
  initialCash: number,
): Promise<ApiResponse<CashRegister>> {
  return window.api.invoke<CashRegister>('cash:open', userId, initialCash);
}

export async function closeCashRegister(
  registerId: number,
  finalCash: number,
  expectedCash: number,
): Promise<ApiResponse<{ finalCash: number; expectedCash: number; difference: number }>> {
  return window.api.invoke<{ finalCash: number; expectedCash: number; difference: number }>(
    'cash:close',
    registerId,
    finalCash,
    expectedCash,
  );
}
