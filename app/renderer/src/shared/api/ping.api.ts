import type { ApiResponse } from '../types/api.types';

export async function pingServer(): Promise<ApiResponse<string>> {
  return window.api.invoke<string>('ping:ping');
}
