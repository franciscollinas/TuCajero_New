import { contextBridge, ipcRenderer } from 'electron';
import type { ApiResponse } from '../renderer/src/shared/types/api.types';

contextBridge.exposeInMainWorld('api', {
  invoke: <T>(channel: string, ...args: unknown[]): Promise<ApiResponse<T>> =>
    ipcRenderer.invoke(channel, ...args),
});
