import type { ApiResponse } from '../types/api.types';
import type { BusinessConfig } from '../types/config.types';

export function getConfig(): Promise<ApiResponse<BusinessConfig>> {
  return window.api.invoke('config:get');
}

export function updateConfig(userId: number, data: Partial<BusinessConfig>): Promise<ApiResponse<BusinessConfig>> {
  return window.api.invoke('config:update', userId, data);
}
