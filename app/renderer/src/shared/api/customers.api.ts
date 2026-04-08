import type { ApiResponse } from '../types/api.types';
import type { Customer, Debt } from '../types/customers.types';

export function searchCustomers(query: string = ''): Promise<ApiResponse<Customer[]>> {
  return window.api.invoke<Customer[]>('customers:search', query);
}

export function getAllCustomers(): Promise<ApiResponse<Customer[]>> {
  return window.api.invoke<Customer[]>('customers:search', '');
}

export function createCustomer(data: Partial<Customer>): Promise<ApiResponse<Customer>> {
  return window.api.invoke<Customer>('customers:create', data);
}

export function updateCustomer(id: number, data: Partial<Customer>): Promise<ApiResponse<Customer>> {
  return window.api.invoke<Customer>('customers:update', id, data);
}

export function getCustomerDebts(id: number): Promise<ApiResponse<Debt[]>> {
  return window.api.invoke<Debt[]>('customers:getDebts', id);
}

export function payCustomerDebt(debtId: number, amount: number, method: string, cashSessionId?: number): Promise<ApiResponse<Debt>> {
  return window.api.invoke<Debt>('customers:payDebt', debtId, amount, method, cashSessionId);
}

export function getCustomerHistory(id: number): Promise<ApiResponse<any[]>> {
  return window.api.invoke<any[]>('customers:getHistory', id);
}
