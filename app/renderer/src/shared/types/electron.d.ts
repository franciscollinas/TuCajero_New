import type { ApiResponse } from './api.types';

declare global {
  interface Window {
    api: {
      invoke<T>(channel: string, ...args: unknown[]): Promise<ApiResponse<T>>;
    };
  }
}

export {};
