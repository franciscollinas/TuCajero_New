import type { ApiResponse } from '../types/api.types';
import type { AlertSummary, ProductAlert } from '../types/alert.types';

export function getProductAlerts(): Promise<ApiResponse<ProductAlert[]>> {
  return window.api.invoke<ProductAlert[]>('alerts:getProductAlerts');
}

export function getAlertSummary(): Promise<ApiResponse<AlertSummary>> {
  return window.api.invoke<AlertSummary>('alerts:getSummary');
}
